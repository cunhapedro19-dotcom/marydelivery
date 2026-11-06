import type { MenuItem, PublicMeal } from "@/db/schema";

export type MealLine = {
  key: string;
  mealId: number;
  proteinId: number | null;
  sideIds: number[];
  extraIds: number[];
  note: string;
  done: boolean;
};

export type OrderSelection = {
  lines: MealLine[];
  drinkQty: Record<string, number>;
  note: string;
  receivingMode: "pickup" | "own" | "app" | null;
  customer: {
    name: string;
    phone: string;
    street: string;
    number: string;
    complement: string;
    neighborhood: string;
    reference: string;
    deliveryNote: string;
  };
  paymentMethodId: number | null;
  needsChange: boolean | null;
  changeFor: string;
};

export type MenuData = {
  config: {
    id: number;
    slug: string;
    name: string;
    emoji: string;
    description: string;
    logoUrl: string | null;
    heroUrl: string | null;
    whatsappNumber: string;
    whatsappGreeting: string;
    openingHours: string;
    openingDays: string;
    acceptingOrders: boolean;
    pausedMessage: string;
    drinkRequired: boolean;
    pickupEnabled: boolean;
    pickupAddress: string;
    pickupHours: string;
    ownDeliveryEnabled: boolean;
    appDeliveryEnabled: boolean;
    appDeliveryService: string;
    deliveryAreas: string;
    deliveryNotes: string;
  };
  meals: PublicMeal[];
  extras: MenuItem[];
  drinks: MenuItem[];
  payments: { id: number; name: string; active: boolean; asksChange: boolean; sortOrder: number }[];
};