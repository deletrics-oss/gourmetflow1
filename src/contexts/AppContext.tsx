import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type OrderStatus = "new" | "preparing" | "ready" | "completed";

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  notes?: string;
}

export interface Order {
  id: string;
  number: number;
  table?: number;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
  deliveryType: "delivery" | "pickup" | "dine-in";
}

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  promotionalPrice?: number;
  image?: string;
  category: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  image?: string;
  promotion?: boolean;
}

interface AppContextType {
  orders: Order[];
  menuItems: MenuItem[];
  categories: Category[];
  addOrder: (order: Omit<Order, "id" | "number" | "createdAt" | "updatedAt">) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  addMenuItem: (item: Omit<MenuItem, "id">) => void;
  addCategory: (category: Omit<Category, "id">) => void;
  deleteMenuItem: (id: string) => void;
  deleteCategory: (id: string) => void;
  updateMenuItem: (id: string, item: Partial<MenuItem>) => void;
  updateCategory: (id: string, category: Partial<Category>) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem("gourmetflow_orders");
    return saved ? JSON.parse(saved) : [];
  });

  const [menuItems, setMenuItems] = useState<MenuItem[]>(() => {
    const saved = localStorage.getItem("gourmetflow_menu");
    return saved ? JSON.parse(saved) : [
      {
        id: "1",
        name: "Marguerita",
        description: "Molho de tomate, mussarela e manjericão",
        price: 10,
        promotionalPrice: 9,
        image: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002",
        category: "Pizzas",
      },
    ];
  });

  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem("gourmetflow_categories");
    return saved ? JSON.parse(saved) : [
      {
        id: "1",
        name: "Pizzas",
        image: "https://images.unsplash.com/photo-1513104890138-7c749659a591",
        promotion: true,
      },
      {
        id: "2",
        name: "Bebidas",
        image: "https://images.unsplash.com/photo-1546173159-315724a31696",
        promotion: true,
        description: "Refrigerantes, sucos e águas",
      },
      {
        id: "3",
        name: "Sobremesas",
        image: "https://images.unsplash.com/photo-1563805042-7684c019e1cb",
        promotion: true,
        description: "Deliciosas sobremesas para finalizar sua refeição",
      },
      {
        id: "4",
        name: "Lanches",
        description: "Com os melhores lanches da cidade!",
      },
    ];
  });

  useEffect(() => {
    localStorage.setItem("gourmetflow_orders", JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem("gourmetflow_menu", JSON.stringify(menuItems));
  }, [menuItems]);

  useEffect(() => {
    localStorage.setItem("gourmetflow_categories", JSON.stringify(categories));
  }, [categories]);

  const addOrder = (orderData: Omit<Order, "id" | "number" | "createdAt" | "updatedAt">) => {
    const newOrder: Order = {
      ...orderData,
      id: Date.now().toString(),
      number: orders.length + 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setOrders((prev) => [newOrder, ...prev]);
  };

  const updateOrderStatus = (orderId: string, status: OrderStatus) => {
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId ? { ...order, status, updatedAt: new Date() } : order
      )
    );
  };

  const addMenuItem = (item: Omit<MenuItem, "id">) => {
    const newItem: MenuItem = {
      ...item,
      id: Date.now().toString(),
    };
    setMenuItems((prev) => [...prev, newItem]);
  };

  const addCategory = (category: Omit<Category, "id">) => {
    const newCategory: Category = {
      ...category,
      id: Date.now().toString(),
    };
    setCategories((prev) => [...prev, newCategory]);
  };

  const deleteMenuItem = (id: string) => {
    setMenuItems((prev) => prev.filter((item) => item.id !== id));
  };

  const deleteCategory = (id: string) => {
    setCategories((prev) => prev.filter((cat) => cat.id !== id));
  };

  const updateMenuItem = (id: string, item: Partial<MenuItem>) => {
    setMenuItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, ...item } : i))
    );
  };

  const updateCategory = (id: string, category: Partial<Category>) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...category } : c))
    );
  };

  return (
    <AppContext.Provider
      value={{
        orders,
        menuItems,
        categories,
        addOrder,
        updateOrderStatus,
        addMenuItem,
        addCategory,
        deleteMenuItem,
        deleteCategory,
        updateMenuItem,
        updateCategory,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within AppProvider");
  }
  return context;
}
