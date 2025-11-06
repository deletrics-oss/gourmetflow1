export const defaultImages = {
  categories: {
    pizzas: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=300&fit=crop",
    bebidas: "https://images.unsplash.com/photo-1437418747212-8d9709afab22?w=400&h=300&fit=crop",
    refrigerantes: "https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=400&h=300&fit=crop",
    sucos: "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400&h=300&fit=crop",
    sobremesas: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400&h=300&fit=crop",
    lanches: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop",
    massas: "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400&h=300&fit=crop",
    saladas: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400&h=300&fit=crop"
  },
  items: {
    // Pizzas
    margherita: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&h=300&fit=crop",
    calabresa: "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400&h=300&fit=crop",
    portuguesa: "https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?w=400&h=300&fit=crop",
    quatroQueijos: "https://images.unsplash.com/photo-1573821663912-6df460f9c684?w=400&h=300&fit=crop",
    frango: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=300&fit=crop",
    
    // Bebidas
    cocaCola: "https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&h=300&fit=crop",
    guarana: "https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=400&h=300&fit=crop",
    sprite: "https://images.unsplash.com/photo-1625772452859-1c03d5bf1137?w=400&h=300&fit=crop",
    fanta: "https://images.unsplash.com/photo-1624517452488-04869289c4ca?w=400&h=300&fit=crop",
    agua: "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400&h=300&fit=crop",
    suco: "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400&h=300&fit=crop",
    cerveja: "https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400&h=300&fit=crop",
    vinho: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&h=300&fit=crop",
    
    // Sobremesas
    sorvete: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400&h=300&fit=crop",
    pudim: "https://images.unsplash.com/photo-1587314168485-3236d6710814?w=400&h=300&fit=crop",
    brownie: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400&h=300&fit=crop",
    
    // Lanches
    hamburguer: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop",
    xSalada: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400&h=300&fit=crop",
    hotdog: "https://images.unsplash.com/photo-1612392061432-bc4b4b0b3f0a?w=400&h=300&fit=crop"
  }
};

export const getCategoryImage = (categoryName: string): string => {
  const normalized = categoryName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  if (normalized.includes("pizza")) return defaultImages.categories.pizzas;
  if (normalized.includes("bebida") || normalized.includes("drink")) return defaultImages.categories.bebidas;
  if (normalized.includes("refrigerante") || normalized.includes("refri")) return defaultImages.categories.refrigerantes;
  if (normalized.includes("suco")) return defaultImages.categories.sucos;
  if (normalized.includes("sobremesa") || normalized.includes("doce")) return defaultImages.categories.sobremesas;
  if (normalized.includes("lanche") || normalized.includes("sanduiche")) return defaultImages.categories.lanches;
  if (normalized.includes("massa") || normalized.includes("pasta")) return defaultImages.categories.massas;
  if (normalized.includes("salada")) return defaultImages.categories.saladas;
  
  return defaultImages.categories.pizzas; // default
};

export const getItemImage = (itemName: string): string => {
  const normalized = itemName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  // Pizzas
  if (normalized.includes("margherita") || normalized.includes("marguerita")) return defaultImages.items.margherita;
  if (normalized.includes("calabresa")) return defaultImages.items.calabresa;
  if (normalized.includes("portuguesa")) return defaultImages.items.portuguesa;
  if (normalized.includes("quatro queijo") || normalized.includes("4 queijo")) return defaultImages.items.quatroQueijos;
  if (normalized.includes("frango")) return defaultImages.items.frango;
  
  // Bebidas
  if (normalized.includes("coca") || normalized.includes("cola")) return defaultImages.items.cocaCola;
  if (normalized.includes("guarana")) return defaultImages.items.guarana;
  if (normalized.includes("sprite")) return defaultImages.items.sprite;
  if (normalized.includes("fanta")) return defaultImages.items.fanta;
  if (normalized.includes("agua")) return defaultImages.items.agua;
  if (normalized.includes("suco")) return defaultImages.items.suco;
  if (normalized.includes("cerveja")) return defaultImages.items.cerveja;
  if (normalized.includes("vinho")) return defaultImages.items.vinho;
  
  // Sobremesas
  if (normalized.includes("sorvete") || normalized.includes("ice cream")) return defaultImages.items.sorvete;
  if (normalized.includes("pudim")) return defaultImages.items.pudim;
  if (normalized.includes("brownie")) return defaultImages.items.brownie;
  
  // Lanches
  if (normalized.includes("hamburguer") || normalized.includes("burger")) return defaultImages.items.hamburguer;
  if (normalized.includes("x-salada") || normalized.includes("xis")) return defaultImages.items.xSalada;
  if (normalized.includes("hot") || normalized.includes("cachorro")) return defaultImages.items.hotdog;
  
  return defaultImages.categories.pizzas; // default
};
