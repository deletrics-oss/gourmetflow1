import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, Sparkles, Copy, Trash } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/lib/supabase";
import { EditCategoryDialog } from "@/components/dialogs/EditCategoryDialog";
import { EditMenuItemDialog } from "@/components/dialogs/EditMenuItemDialog";
import { AddCategoryDialog } from "@/components/dialogs/AddCategoryDialog";
import { AddMenuItemDialog } from "@/components/dialogs/AddMenuItemDialog";
import { ExtractMenuDialog } from "@/components/dialogs/ExtractMenuDialog";
import { toast } from "sonner";

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

  useEffect(() => {
    loadData();
  }, []);

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
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Gestão de Cardápio</h1>
          <p className="text-muted-foreground">Configure categorias e itens do seu menu</p>
        </div>
        <Button size="lg" className="gap-2" onClick={() => setExtractDialogOpen(true)}>
          <Sparkles className="h-4 w-4" />
          Extrair com IA
        </Button>
      </div>

      <Tabs defaultValue="categorias" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="categorias">Categorias</TabsTrigger>
          <TabsTrigger value="itens">Itens do Menu</TabsTrigger>
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
                {category.image ? (
                  <div className="relative h-48 w-full overflow-hidden">
                    <img
                      src={category.image}
                      alt={category.name}
                      className="h-full w-full object-cover"
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
          <div className="mb-4 flex items-center gap-2">
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
                {item.image_url && (
                  <div className="relative h-48 w-full overflow-hidden">
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
                <div className="p-4">
                  <h3 className="font-semibold text-lg mb-1">{item.name}</h3>
                  {item.description && (
                    <p className="text-sm text-muted-foreground mb-3">{item.description}</p>
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
      <ExtractMenuDialog open={extractDialogOpen} onOpenChange={setExtractDialogOpen} />
      
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
