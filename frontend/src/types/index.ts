// ========== Auth ==========
export interface User {
  id: string;
  email: string;
  name: string;
  pin?: string;
  avatarUrl?: string;
  role: Role;
  roleId: string;
  branchId: string;
  branch?: Branch;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Role {
  id: string;
  name: string;
  slug: string;
  permissions: string[];
  description?: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface PinLoginCredentials {
  userId: string;
  pin: string;
}

// ========== Branch ==========
export interface Branch {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  taxId?: string;
  currency?: string;
  timezone?: string;
  isActive: boolean;
  settings?: BranchSettings;
  createdAt?: string;
}

export interface BranchSettings {
  currency: string;
  taxRate: number;
  timezone: string;
  receiptHeader?: string;
  receiptFooter?: string;
}

// ========== Zones & Tables ==========
export interface Zone {
  id: string;
  name: string;
  branchId: string;
  color?: string;
  sortOrder: number;
  isActive: boolean;
  tables?: Table[];
}

export interface Table {
  id: string;
  number: number;
  name: string;
  zoneId: string;
  zone?: Zone;
  capacity: number;
  status: TableStatus;
  posX?: number;
  posY?: number;
  shape?: TableShape;
  currentOrderId?: string;
  currentOrder?: Order;
  assignedUserId?: string;
  assignedUser?: User;
  occupiedAt?: string;
  isActive: boolean;
}

export type TableStatus = 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'CLEANING' | 'BLOCKED';
export type TableShape = 'round' | 'square' | 'rect' | 'bar' | 'SQUARE' | 'ROUND' | 'RECTANGLE';

// ========== Categories & Products ==========
export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color?: string;
  icon?: string;
  parentId?: string;
  parent?: Category;
  children?: Category[];
  sortOrder: number;
  isActive: boolean;
  productCount?: number;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  sku?: string;
  categoryId: string;
  category?: Category;
  price: number;
  cost?: number;
  imageUrl?: string;
  courseType: CourseType;
  station?: string;
  modifierGroups?: ModifierGroup[];
  isAvailable: boolean;
  isActive: boolean;
  sortOrder: number;
  tags?: string[];
}

export type CourseType = 'ENTRADA' | 'PLATO_FUERTE' | 'POSTRE' | 'BEBIDA' | 'ACOMPANAMIENTO' | 'OTRO';

export interface ModifierGroup {
  id: string;
  name: string;
  required: boolean;
  minSelections: number;
  maxSelections: number;
  modifiers: Modifier[];
}

export interface Modifier {
  id: string;
  name: string;
  price: number;
  groupId: string;
  isActive: boolean;
  sortOrder: number;
}

// ========== Orders ==========
export interface Order {
  id: string;
  orderNumber: string;
  type: OrderType;
  status: OrderStatus;
  tableId?: string;
  table?: Table;
  customerId?: string;
  customer?: Customer;
  userId: string;
  user?: User;
  branchId: string;
  items: OrderItem[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  tipAmount: number;
  total: number;
  notes?: string;
  guestCount?: number;
  payments?: Payment[];
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
}

export type OrderType = 'DINE_IN' | 'TAKEOUT' | 'DELIVERY';
export type OrderStatus = 'OPEN' | 'IN_PROGRESS' | 'READY' | 'DELIVERED' | 'CLOSED' | 'CANCELLED';

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  product?: Product;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  courseType: CourseType;
  station?: string;
  status: OrderItemStatus;
  modifiers?: OrderItemModifier[];
  notes?: string;
  sentToKitchenAt?: string;
  readyAt?: string;
  deliveredAt?: string;
  sortOrder: number;
}

export type OrderItemStatus = 'PENDING' | 'SENT' | 'PREPARING' | 'READY' | 'DELIVERED' | 'CANCELLED';

export interface OrderItemModifier {
  id: string;
  orderItemId: string;
  modifierId: string;
  name: string;
  price: number;
}

// ========== Payments ==========
export interface Payment {
  id: string;
  orderId: string;
  order?: Order;
  method: PaymentMethod;
  amount: number;
  tipAmount: number;
  reference?: string;
  status: PaymentStatus;
  processedById: string;
  processedBy?: User;
  createdAt: string;
}

export type PaymentMethod = 'CASH' | 'CARD' | 'YAPPY' | 'TRANSFER' | 'OTHER';
export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'REFUNDED' | 'FAILED';

// ========== Invoice ==========
export interface Invoice {
  id: string;
  invoiceNumber: string;
  orderId: string;
  order?: Order;
  customerId?: string;
  customer?: Customer;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  status: InvoiceStatus;
  issuedAt: string;
}

export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'PAID' | 'CANCELLED' | 'VOIDED';

// ========== Customers ==========
export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  loyaltyPoints: number;
  totalSpent: number;
  visitCount: number;
  lastVisit?: string;
  tags?: string[];
  isActive: boolean;
  createdAt: string;
}

// ========== Reservations ==========
export interface Reservation {
  id: string;
  customerId?: string;
  customer?: Customer;
  customerName: string;
  customerPhone?: string;
  date: string;
  time: string;
  endTime?: string;
  guestCount: number;
  tableId?: string;
  table?: Table;
  status: ReservationStatus;
  notes?: string;
  branchId: string;
  createdAt: string;
}

export type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'SEATED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

// ========== Shifts & Cash ==========
export interface Shift {
  id: string;
  userId: string;
  user?: User;
  branchId: string;
  startedAt: string;
  endedAt?: string;
  openingCash: number;
  closingCash?: number;
  expectedCash?: number;
  cashDifference?: number;
  totalSales: number;
  totalOrders: number;
  status: ShiftStatus;
  notes?: string;
}

export type ShiftStatus = 'OPEN' | 'CLOSED';

export interface CashMovement {
  id: string;
  shiftId: string;
  type: 'IN' | 'OUT';
  amount: number;
  reason: string;
  userId: string;
  user?: User;
  createdAt: string;
}

// ========== Inventory & Supplies ==========
export interface Supply {
  id: string;
  name: string;
  sku?: string;
  unit: string;
  categoryId?: string;
  currentStock: number;
  minStock: number;
  maxStock?: number;
  cost: number;
  supplierId?: string;
  supplier?: Supplier;
  isActive: boolean;
  lastRestockedAt?: string;
}

export interface InventoryMovement {
  id: string;
  supplyId: string;
  supply?: Supply;
  type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'WASTE';
  quantity: number;
  previousStock: number;
  newStock: number;
  reason?: string;
  userId: string;
  user?: User;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  isActive: boolean;
}

// ========== Recipes ==========
export interface Recipe {
  id: string;
  productId: string;
  product?: Product;
  ingredients: RecipeIngredient[];
  yield: number;
  yieldUnit: string;
  instructions?: string;
  costPerUnit: number;
}

export interface RecipeIngredient {
  id: string;
  recipeId: string;
  supplyId: string;
  supply?: Supply;
  quantity: number;
  unit: string;
  cost: number;
}

// ========== Purchases ==========
export interface Purchase {
  id: string;
  purchaseNumber: string;
  supplierId: string;
  supplier?: Supplier;
  items: PurchaseItem[];
  subtotal: number;
  taxAmount: number;
  total: number;
  status: PurchaseStatus;
  receivedAt?: string;
  notes?: string;
  createdAt: string;
}

export interface PurchaseItem {
  id: string;
  purchaseId: string;
  supplyId: string;
  supply?: Supply;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export type PurchaseStatus = 'DRAFT' | 'ORDERED' | 'RECEIVED' | 'CANCELLED';

// ========== Alerts ==========
export interface Alert {
  id: string;
  type: AlertType;
  title: string;
  message: string;
  severity: AlertSeverity;
  isRead: boolean;
  data?: Record<string, unknown>;
  branchId: string;
  createdAt: string;
}

export type AlertType = 'INVENTORY_LOW' | 'ORDER_LATE' | 'SHIFT_REMINDER' | 'SYSTEM' | 'RESERVATION' | 'PAYMENT';
export type AlertSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

// ========== Reports ==========
export interface DailySalesReport {
  date: string;
  totalSales: number;
  totalOrders: number;
  averageTicket: number;
  topProducts: { productId: string; name: string; quantity: number; revenue: number }[];
  salesByHour: { hour: number; sales: number; orders: number }[];
  salesByPaymentMethod: { method: PaymentMethod; amount: number; count: number }[];
  salesByCategory: { categoryId: string; name: string; amount: number }[];
}

export interface KpiSummary {
  shiftSales: number;
  activeOrders: number;
  occupiedTables: number;
  totalTables: number;
  averageTicket: number;
  pendingReservations: number;
  lowStockItems: number;
}

// ========== KDS ==========
export interface KdsOrder {
  id: string;
  orderNumber: string;
  tableNumber?: number;
  tableName?: string;
  items: KdsOrderItem[];
  createdAt: string;
  elapsedMinutes: number;
  notes?: string;
  serverName: string;
  status: 'NEW' | 'PREPARING' | 'READY' | 'LATE';
}

export interface KdsOrderItem {
  id: string;
  name: string;
  quantity: number;
  modifiers?: string[];
  notes?: string;
  status: OrderItemStatus;
  courseType: CourseType;
}

// ========== Pagination ==========
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ========== Cart (local) ==========
export interface CartItem {
  tempId: string;
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  courseType: CourseType;
  station?: string;
  modifiers: CartItemModifier[];
  notes?: string;
}

export interface CartItemModifier {
  modifierId: string;
  name: string;
  price: number;
}
