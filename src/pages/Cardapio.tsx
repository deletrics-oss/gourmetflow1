import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, Sparkles, Copy, Trash, AlertTriangle, ImagePlus, ImageOff, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/lib/supabase";
import { useRestaurant } from "@/hooks/useRestaurant";
import { EditCategoryDialog } from "@/components/dialogs/EditCategoryDialog";
import { EditMenuItemDialog } from "@/components/dialogs/EditMenuItemDialog";
import { AddCategoryDialog } from "@/components/dialogs/AddCategoryDialog";
import { AddMenuItemDialog } from "@/components/dialogs/AddMenuItemDialog";
import { ExtractMenuDialog } from "@/components/dialogs/ExtractMenuDialog";
import { toast } from "sonner";
import { decode } from "base64-arraybuffer";

export default function Cardapio() {
  const [categories, setCategories] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [extractDialogOpen, setExtractDialogOpen] = useState(false);
  const [editCategoryDialogOpen, setEditCategoryDialogOpen] = useState(false);
  const [editItemDialogOpen, setEditItemDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [hasGeminiKey, setHasGeminiKey] = useState<boolean | null>(null);
  
  // Estados para geração de fotos em lote
  const [generatingPhotos, setGeneratingPhotos] = useState(false);
  const [photoProgress, setPhotoProgress] = useState({ current: 0, total: 0, itemName: '' });
  
  const { restaurantId } = useRestaurant();

  // Calcula itens sem foto
  const itemsWithoutPhoto = useMemo(() => {
    return menuItems.filter(item => !item.image_url || item.image_url.trim() === '');
  }, [menuItems]);

  useEffect(() => {
    loadData();
    checkGeminiKey();
  }, [restaurantId]);

  const checkGeminiKey = async () => {
    if (!restaurantId) return;
    
    const { data } = await supabase
      .from('restaurant_settings')
      .select('gemini_api_key')
      .eq('restaurant_id', restaurantId)
      .maybeSingle();
    
    setHasGeminiKey(!!data?.gemini_api_key);
  };

  const loadData = async () => {
    try {
      const { data: cats } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order');
      
      const { data: items } = await supabase
        .from('menu_items')
        .select('*')
        .order('name');
      
      setCategories(cats || []);
      setMenuItems(items || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleFillMissingPhotos = async () => {
    if (!restaurantId || itemsWithoutPhoto.length === 0) {
      toast.error('Nenhum item sem foto encontrado');
      return;
    }
    
    if (!confirm(`Gerar fotos com IA para ${itemsWithoutPhoto.length} item(ns) sem foto?\n\nIsso pode levar alguns minutos dependendo da quantidade.`)) {
      return;
    }
    
    setGeneratingPhotos(true);
    setPhotoProgress({ current: 0, total: itemsWithoutPhoto.length, itemName: '' });
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < itemsWithoutPhoto.length; i++) {
      const item = itemsWithoutPhoto[i];
      const categoryName = categories.find(c => c.id === item.category_id)?.name || '';
      
      setPhotoProgress({ 
        current: i + 1, 
        total: itemsWithoutPhoto.length, 
        itemName: item.name 
      });
      
      try {
        // 1. Gerar imagem com IA
        const { data, error } = await supabase.functions.invoke('generate-product-image', {
          body: {
            name: item.name,
            category: categoryName,
            description: item.description || '',
            restaurantId
          }
        });
        
        if (error) {
          console.error(`Erro ao gerar imagem para ${item.name}:`, error);
          errorCount++;
          continue;
        }
        
        if (!data?.imageBase64) {
          console.error(`Sem imagem retornada para ${item.name}:`, data);
          errorCount++;
          continue;
        }
        
        // 2. Upload para Storage
        const base64Data = data.imageBase64.replace(/^data:image\/\w+;base64,/, '');
        const fileName = `${restaurantId}/${item.id}_${Date.now()}.png`;
        
        const { error: uploadError } = await supabase.storage
          .from('menu-images')
          .upload(fileName, decode(base64Data), {
            contentType: 'image/png',
            upsert: true
          });
        
        if (uploadError) {
          console.error(`Erro no upload para ${item.name}:`, uploadError);
          errorCount++;
          continue;
        }
        
        // 3. Obter URL pública
        const { data: publicUrlData } = supabase.storage
          .from('menu-images')
          .getPublicUrl(fileName);
        
        // 4. Atualizar item no banco
        const { error: updateError } = await supabase
          .from('menu_items')
          .update({ image_url: publicUrlData.publicUrl })
          .eq('id', item.id);
        
        if (updateError) {
          console.error(`Erro ao atualizar ${item.name}:`, updateError);
          errorCount++;
          continue;
        }
        
        successCount++;
        
      } catch (e) {
        console.error(`Erro ao gerar foto para ${item.name}:`, e);
        errorCount++;
      }
      
      // Delay entre requisições para não sobrecarregar
      if (i < itemsWithoutPhoto.length - 1) {
        await new Promise(r => setTimeout(r, 1500));
      }
    }
    
    setGeneratingPhotos(false);
    setPhotoProgress({ current: 0, total: 0, itemName: '' });
    
    if (successCount > 0) {
      toast.success(`${successCount} foto(s) gerada(s) com sucesso!`);
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} foto(s) não puderam ser geradas`);
    }
    
    loadData(); // Recarregar dados
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (confirm(`Deseja realmente excluir a categoria "${name}"?`)) {
      try {
        await supabase.from('categories').delete().eq('id', id);
        toast.success(`"${name}" foi removida do cardápio`);
        loadData();
      } catch (error) {
        toast.error('Erro ao excluir categoria');
      }
    }
  };

  const handleDeleteItem = async (id: string, name: string) => {
    if (confirm(`Deseja realmente excluir "${name}"?`)) {
      try {
        await supabase.from('menu_items').delete().eq('id', id);
        toast.success(`"${name}" foi removido do cardápio`);
        loadData();
      } catch (error) {
        toast.error('Erro ao excluir item');
      }
    }
  };

  const handleCloneItem = async (item: any) => {
    try {
      const { name, description, price, promotional_price, category_id, image_url, is_available, preparation_time, sort_order } = item;
      await supabase.from('menu_items').insert({
        name: `${name} (Cópia)`,
        description,
        price,
        promotional_price,
        category_id,
        image_url,
        is_available,
        preparation_time,
        sort_order
      });
      toast.success(`"${name}" foi clonado com sucesso`);
      loadData();
    } catch (error) {
      toast.error('Erro ao clonar item');
    }
  };

  const handleCloneCategory = async (category: any) => {
    try {
      const { name, description, image_url, is_active, sort_order } = category;
      await supabase.from('categories').insert({
        name: `${name} (Cópia)`,
        description,
        image_url,
        is_active,
        sort_order
      });
      toast.success(`"${name}" foi clonada com sucesso`);
      loadData();
    } catch (error) {
      toast.error('Erro ao clonar categoria');
    }
  };

  const handleBulkDeleteItems = async () => {
    if (selectedItems.length === 0) return;
    if (!confirm(`Deseja realmente excluir ${selectedItems.length} item(ns) selecionado(s)?`)) return;
    
    try {
      await supabase.from('menu_items').delete().in('id', selectedItems);
      toast.success(`${selectedItems.length} item(ns) removido(s) com sucesso`);
      setSelectedItems([]);
      loadData();
    } catch (error) {
      toast.error('Erro ao excluir itens');
    }
  };

  const handleBulkDeleteCategories = async () => {
    if (selectedCategories.length === 0) return;
    if (!confirm(`Deseja realmente excluir ${selectedCategories.length} categoria(s) selecionada(s)?`)) return;
    
    try {
      await supabase.from('categories').delete().in('id', selectedCategories);
      toast.success(`${selectedCategories.length} categoria(s) removida(s) com sucesso`);
      setSelectedCategories([]);
      loadData();
    } catch (error) {
      toast.error('Erro ao excluir categorias');
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      {/* Modal de progresso */}
      {generatingPhotos && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="p-6 w-96 max-w-[90vw]">
            <div className="flex items-center gap-3 mb-4">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <h3 className="font-semibold">Gerando Fotos com IA</h3>
            </div>
            <Progress value={(photoProgress.current / photoProgress.total) * 100} className="mb-3" />
            <p className="text-sm text-muted-foreground text-center">
              {photoProgress.current} de {photoProgress.total}
            </p>
            {photoProgress.itemName && (
              <p className="text-xs text-muted-foreground mt-1 text-center truncate">
                Gerando: {photoProgress.itemName}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-3 text-center">
              Não feche esta página...
            </p>
          </Card>
        </div>
      )}

      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Gestão de Cardápio</h1>
          <p className="text-muted-foreground">Configure categorias e itens do seu menu</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Botão Preencher Fotos */}
          {itemsWithoutPhoto.length > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="gap-2"
                    onClick={handleFillMissingPhotos}
                    disabled={generatingPhotos || hasGeminiKey === false}
                  >
                    <ImagePlus className="h-4 w-4" />
                    Preencher {itemsWithoutPhoto.length} Foto{itemsWithoutPhoto.length > 1 ? 's' : ''} com IA
                  </Button>
                </TooltipTrigger>
                {hasGeminiKey === false && (
                  <TooltipContent>
                    <p>Configure sua chave de IA em Configurações</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Botão Extrair com IA */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="lg" className="gap-2 relative" onClick={() => setExtractDialogOpen(true)}>
                  <Sparkles className="h-4 w-4" />
                  Extrair com IA
                  {hasGeminiKey === false && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-yellow-500 text-[10px] text-white">
                      <AlertTriangle className="h-3 w-3" />
                    </span>
                  )}
                </Button>
              </TooltipTrigger>
              {hasGeminiKey === false && (
                <TooltipContent>
                  <p>Configure sua chave de IA em Configurações</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <Tabs defaultValue="categorias" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="categorias">Categorias</TabsTrigger>
          <TabsTrigger value="itens">
            Itens do Menu
            {itemsWithoutPhoto.length > 0 && (
              <Badge variant="outline" className="ml-2 text-yellow-600 border-yellow-400">
                {itemsWithoutPhoto.length} sem foto
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="categorias">
          <div className="mb-4 flex items-center gap-2">
            <Button className="gap-2" onClick={() => setCategoryDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Nova Categoria
            </Button>
            {selectedCategories.length > 0 && (
              <Button variant="destructive" className="gap-2" onClick={handleBulkDeleteCategories}>
                <Trash className="h-4 w-4" />
                Excluir {selectedCategories.length} selecionada(s)
              </Button>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <Card key={category.id} className="overflow-hidden hover:shadow-lg transition-shadow relative">
                <div className="absolute top-2 right-2 z-10">
                  <Checkbox
                    checked={selectedCategories.includes(category.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedCategories([...selectedCategories, category.id]);
                      } else {
                        setSelectedCategories(selectedCategories.filter(id => id !== category.id));
                      }
                    }}
                    className="bg-white"
                  />
                </div>
                {category.image_url ? (
                  <div className="relative h-48 w-full overflow-hidden">
                    <img
                      src={category.image_url}
                      alt={category.name}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const parent = e.currentTarget.parentElement;
                        if (parent) {
                          parent.innerHTML = '<div class="h-48 w-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center"><span class="text-4xl">🍴</span></div>';
                        }
                      }}
                    />
                    {category.promotion && (
                      <Badge className="absolute top-3 left-3 bg-status-new text-status-new-foreground">
                        PROMOÇÃO
                      </Badge>
                    )}
                  </div>
                ) : (
                  <div className="h-48 w-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <span className="text-4xl">🍴</span>
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-lg">{category.name}</h3>
                      {category.description && (
                        <p className="text-sm text-muted-foreground mt-1">{category.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 gap-2"
                      onClick={() => {
                        setSelectedCategory(category);
                        setEditCategoryDialogOpen(true);
                      }}
                    >
                      <Edit className="h-3 w-3" />
                      Editar
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="gap-2"
                      onClick={() => handleCloneCategory(category)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="gap-2 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => handleDeleteCategory(category.id, category.name)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="itens">
          <div className="mb-4 flex items-center gap-2 flex-wrap">
            <Button className="gap-2" onClick={() => setItemDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Novo Item
            </Button>
            {selectedItems.length > 0 && (
              <Button variant="destructive" className="gap-2" onClick={handleBulkDeleteItems}>
                <Trash className="h-4 w-4" />
                Excluir {selectedItems.length} selecionado(s)
              </Button>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {menuItems.map((item) => (
              <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow relative">
                <div className="absolute top-2 right-2 z-10">
                  <Checkbox
                    checked={selectedItems.includes(item.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedItems([...selectedItems, item.id]);
                      } else {
                        setSelectedItems(selectedItems.filter(id => id !== item.id));
                      }
                    }}
                    className="bg-white"
                  />
                </div>
                
                {/* Área da imagem com indicador visual para itens sem foto */}
                {item.image_url ? (
                  <div className="relative h-48 w-full overflow-hidden">
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-48 w-full bg-gradient-to-br from-yellow-100 to-yellow-50 dark:from-yellow-900/20 dark:to-yellow-800/10 flex flex-col items-center justify-center">
                    <ImageOff className="h-12 w-12 text-yellow-500 mb-2" />
                    <span className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">Sem foto</span>
                  </div>
                )}

                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-lg mb-1">{item.name}</h3>
                    {!item.image_url && (
                      <Badge variant="outline" className="text-yellow-600 border-yellow-400 shrink-0">
                        Sem foto
                      </Badge>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{item.description}</p>
                  )}
                  <div className="flex items-center gap-2 mb-4">
                    {item.promotional_price ? (
                      <>
                        <span className="text-lg font-bold text-status-new">
                          R$ {item.promotional_price.toFixed(2)}
                        </span>
                        <span className="text-sm text-muted-foreground line-through">
                          R$ {item.price.toFixed(2)}
                        </span>
                      </>
                    ) : (
                      <span className="text-lg font-bold">R$ {item.price.toFixed(2)}</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 gap-2"
                      onClick={() => {
                        setSelectedItem(item);
                        setEditItemDialogOpen(true);
                      }}
                    >
                      <Edit className="h-3 w-3" />
                      Editar
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="gap-2"
                      onClick={() => handleCloneItem(item)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="gap-2 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => handleDeleteItem(item.id, item.name)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <AddCategoryDialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen} />
      <AddMenuItemDialog open={itemDialogOpen} onOpenChange={setItemDialogOpen} />
      <ExtractMenuDialog open={extractDialogOpen} onOpenChange={setExtractDialogOpen} onSuccess={loadData} />
      
      {selectedCategory && (
        <EditCategoryDialog
          open={editCategoryDialogOpen}
          onOpenChange={setEditCategoryDialogOpen}
          category={selectedCategory}
          onSuccess={loadData}
        />
      )}
      
      {selectedItem && (
        <EditMenuItemDialog
          open={editItemDialogOpen}
          onOpenChange={setEditItemDialogOpen}
          item={selectedItem}
          categories={categories}
          onSuccess={loadData}
        />
      )}
    </div>
  );
}
