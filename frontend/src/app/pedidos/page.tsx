'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PaperAirplaneIcon,
  TrashIcon,
  ChatBubbleLeftIcon,
  XMarkIcon,
  TableCellsIcon,
  ShoppingCartIcon,
} from '@heroicons/react/24/outline';
import MainLayout from '@/components/layout/MainLayout';
import Header from '@/components/layout/Header';
import Tabs from '@/components/ui/Tabs';
import ProductCard from '@/components/common/ProductCard';
import RequirePermission from '@/components/common/RequirePermission';
import QuantitySelector from '@/components/ui/QuantitySelector';
import SearchBar from '@/components/ui/SearchBar';
import Button from '@/components/ui/Button';
import { BottomSheet } from '@/components/ui/Modal';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { useCartStore } from '@/store/cart.store';
import { useOrdersStore } from '@/store/orders.store';
import { useTablesStore } from '@/store/tables.store';
import { cn, formatCurrency } from '@/lib/utils';
import type { Category, Product, CourseType, CartItem, ModifierGroup } from '@/types';
import api from '@/lib/api';
import toast from 'react-hot-toast';

const courseTypes: { id: CourseType | 'ALL'; label: string }[] = [
  { id: 'ALL', label: 'Todos' },
  { id: 'ENTRADA', label: 'Entradas' },
  { id: 'PLATO_FUERTE', label: 'Platos Fuertes' },
  { id: 'BEBIDA', label: 'Bebidas' },
  { id: 'POSTRE', label: 'Postres' },
  { id: 'ACOMPANAMIENTO', label: 'Extras' },
];

const presetNotes = [
  'Sin cebolla', 'Extra picante', 'Sin gluten', 'Sin lactosa',
  'Poco cocido', 'Bien cocido', 'Sin sal', 'Extra salsa',
  'Sin wasabi', 'Extra jengibre', 'Sin soya', 'Para compartir',
  'Sin hielo', 'Extra limon', 'Urgente', 'Sin mayonesa',
];

export default function PedidosPage() {
  const router = useRouter();
  const cart = useCartStore();
  const { createOrder, sendToKitchen } = useOrdersStore();
  const { updateTableStatus } = useTablesStore();

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedCourse, setSelectedCourse] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showModifiers, setShowModifiers] = useState(false);
  const [pendingProduct, setPendingProduct] = useState<Product | null>(null);
  const [selectedModifiers, setSelectedModifiers] = useState<Record<string, string[]>>({});
  const [showNotes, setShowNotes] = useState(false);
  const [notesItemId, setNotesItemId] = useState<string | null>(null);

  // Demo data
  const demoCategories: Category[] = [
    { id: 'all', name: 'Todos', slug: 'all', sortOrder: 0, isActive: true },
    { id: 'sushi', name: 'Sushi Rolls', slug: 'sushi', sortOrder: 1, isActive: true, color: '#D4842A' },
    { id: 'sashimi', name: 'Sashimi', slug: 'sashimi', sortOrder: 2, isActive: true, color: '#EF4444' },
    { id: 'entradas', name: 'Entradas', slug: 'entradas', sortOrder: 3, isActive: true, color: '#10B981' },
    { id: 'sopas', name: 'Sopas', slug: 'sopas', sortOrder: 4, isActive: true, color: '#F59E0B' },
    { id: 'principales', name: 'Principales', slug: 'principales', sortOrder: 5, isActive: true, color: '#8B5CF6' },
    { id: 'postres', name: 'Postres', slug: 'postres', sortOrder: 6, isActive: true, color: '#EC4899' },
    { id: 'bebidas', name: 'Bebidas', slug: 'bebidas', sortOrder: 7, isActive: true, color: '#3B82F6' },
  ];

  const demoProducts: Product[] = [
    { id: 'p1', name: 'Dragon Roll', categoryId: 'sushi', price: 18.50, courseType: 'PLATO_FUERTE', isAvailable: true, isActive: true, sortOrder: 1, station: 'sushi-bar', description: 'Tempura shrimp, aguacate, anguila glaseada' },
    { id: 'p2', name: 'Salmon Roll', categoryId: 'sushi', price: 14.00, courseType: 'PLATO_FUERTE', isAvailable: true, isActive: true, sortOrder: 2, station: 'sushi-bar', description: 'Salmon fresco, queso crema, pepino' },
    { id: 'p3', name: 'Rainbow Roll', categoryId: 'sushi', price: 22.00, courseType: 'PLATO_FUERTE', isAvailable: true, isActive: true, sortOrder: 3, station: 'sushi-bar' },
    { id: 'p4', name: 'Spicy Tuna Roll', categoryId: 'sushi', price: 16.00, courseType: 'PLATO_FUERTE', isAvailable: true, isActive: true, sortOrder: 4, station: 'sushi-bar' },
    { id: 'p5', name: 'Sashimi Salmon', categoryId: 'sashimi', price: 24.00, courseType: 'PLATO_FUERTE', isAvailable: true, isActive: true, sortOrder: 1, station: 'sushi-bar' },
    { id: 'p6', name: 'Sashimi Atun', categoryId: 'sashimi', price: 26.00, courseType: 'PLATO_FUERTE', isAvailable: true, isActive: true, sortOrder: 2, station: 'sushi-bar' },
    { id: 'p7', name: 'Edamame', categoryId: 'entradas', price: 8.00, courseType: 'ENTRADA', isAvailable: true, isActive: true, sortOrder: 1, station: 'cocina-fria' },
    { id: 'p8', name: 'Gyoza (6 pcs)', categoryId: 'entradas', price: 12.00, courseType: 'ENTRADA', isAvailable: true, isActive: true, sortOrder: 2, station: 'cocina-caliente' },
    { id: 'p9', name: 'Tempura Mixto', categoryId: 'entradas', price: 15.00, courseType: 'ENTRADA', isAvailable: true, isActive: true, sortOrder: 3, station: 'cocina-caliente' },
    { id: 'p10', name: 'Miso Soup', categoryId: 'sopas', price: 6.50, courseType: 'ENTRADA', isAvailable: true, isActive: true, sortOrder: 1, station: 'cocina-caliente' },
    { id: 'p11', name: 'Ramen Tonkotsu', categoryId: 'sopas', price: 18.00, courseType: 'PLATO_FUERTE', isAvailable: true, isActive: true, sortOrder: 2, station: 'cocina-caliente' },
    { id: 'p12', name: 'Teriyaki Chicken', categoryId: 'principales', price: 20.00, courseType: 'PLATO_FUERTE', isAvailable: true, isActive: true, sortOrder: 1, station: 'cocina-caliente' },
    { id: 'p13', name: 'Wagyu Tataki', categoryId: 'principales', price: 38.00, courseType: 'PLATO_FUERTE', isAvailable: true, isActive: true, sortOrder: 2, station: 'cocina-caliente' },
    { id: 'p14', name: 'Mochi Ice Cream', categoryId: 'postres', price: 9.00, courseType: 'POSTRE', isAvailable: true, isActive: true, sortOrder: 1, station: 'postres' },
    { id: 'p15', name: 'Matcha Cheesecake', categoryId: 'postres', price: 12.00, courseType: 'POSTRE', isAvailable: true, isActive: true, sortOrder: 2, station: 'postres' },
    { id: 'p16', name: 'Sake Copa', categoryId: 'bebidas', price: 8.00, courseType: 'BEBIDA', isAvailable: true, isActive: true, sortOrder: 1, station: 'bar' },
    { id: 'p17', name: 'Asahi Beer', categoryId: 'bebidas', price: 6.00, courseType: 'BEBIDA', isAvailable: true, isActive: true, sortOrder: 2, station: 'bar' },
    { id: 'p18', name: 'Te Verde', categoryId: 'bebidas', price: 4.00, courseType: 'BEBIDA', isAvailable: true, isActive: true, sortOrder: 3, station: 'bar' },
    { id: 'p19', name: 'Limonada Yuzu', categoryId: 'bebidas', price: 7.00, courseType: 'BEBIDA', isAvailable: true, isActive: true, sortOrder: 4, station: 'bar' },
    { id: 'p20', name: 'Agua Mineral', categoryId: 'bebidas', price: 3.00, courseType: 'BEBIDA', isAvailable: true, isActive: true, sortOrder: 5, station: 'bar' },
  ];

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [catRes, prodRes] = await Promise.allSettled([
          api.get('/categories'),
          api.get('/products?limit=100'),
        ]);
        if (catRes.status === 'fulfilled') {
          setCategories([{ id: 'all', name: 'Todos', slug: 'all', sortOrder: 0, isActive: true }, ...catRes.value.data]);
        } else {
          setCategories(demoCategories);
        }
        if (prodRes.status === 'fulfilled') {
          const prodData = prodRes.value.data.data || prodRes.value.data;
          setProducts(prodData);
        } else {
          setProducts(demoProducts);
        }
      } catch {
        setCategories(demoCategories);
        setProducts(demoProducts);
      }
      setIsLoading(false);
    };
    fetchData();
  }, []);

  // Filter products
  const filteredProducts = useMemo(() => {
    let result = products.length > 0 ? products : demoProducts;

    if (selectedCategory && selectedCategory !== 'all') {
      result = result.filter((p) => p.categoryId === selectedCategory);
    }

    if (selectedCourse !== 'ALL') {
      result = result.filter((p) => p.courseType === selectedCourse);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) => p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [products, selectedCategory, selectedCourse, searchQuery]);

  const handleAddProduct = (product: Product) => {
    if (product.modifierGroups && product.modifierGroups.length > 0) {
      setPendingProduct(product);
      setSelectedModifiers({});
      setShowModifiers(true);
    } else {
      cart.addItem({
        productId: product.id,
        name: product.name,
        unitPrice: product.price,
        courseType: product.courseType,
        station: product.station,
      });
      toast.success(product.name, { icon: '+', duration: 1000 });
    }
  };

  const handleConfirmModifiers = () => {
    if (!pendingProduct) return;
    const modifiers = Object.entries(selectedModifiers).flatMap(([, ids]) =>
      ids.map((modId) => {
        const mod = pendingProduct.modifierGroups
          ?.flatMap((g) => g.modifiers)
          .find((m) => m.id === modId);
        return { modifierId: modId, name: mod?.name || '', price: mod?.price || 0 };
      })
    );
    cart.addItem({
      productId: pendingProduct.id,
      name: pendingProduct.name,
      unitPrice: pendingProduct.price,
      courseType: pendingProduct.courseType,
      station: pendingProduct.station,
      modifiers,
    });
    setShowModifiers(false);
    setPendingProduct(null);
    toast.success(pendingProduct.name, { icon: '+', duration: 1000 });
  };

  const handleNoteSelect = (note: string) => {
    if (!notesItemId) return;
    const item = cart.items.find((i) => i.tempId === notesItemId);
    if (item) {
      const existing = item.notes || '';
      const newNote = existing ? `${existing}, ${note}` : note;
      cart.updateItemNotes(notesItemId, newNote);
    }
    setShowNotes(false);
    setNotesItemId(null);
  };

  const handleSendToKitchen = async () => {
    if (cart.items.length === 0) return;
    const tableId = cart.tableId;
    const tableName = cart.tableName;
    const payload = cart.getCartPayload();
    const order = await createOrder(payload);
    if (order) {
      await sendToKitchen(order.id);

      // Update table status to OCCUPIED on the backend
      // (The backend's createOrder already sets the table to OCCUPIED,
      //  but we also call updateTableStatus to ensure the store is refreshed)
      if (tableId) {
        await updateTableStatus(tableId, 'OCCUPIED');
      }

      const orderNum = order.orderNumber;
      cart.clearCart();
      toast.success(`Orden #${orderNum} enviada a cocina · ${tableName || 'Mesa'}`, {
        duration: 2500,
        icon: '🍣',
      });
      // Navigate back to mesas
      router.push('/mesas');
    }
  };

  // Cart calculations
  const subtotal = cart.items.reduce((sum, item) => {
    const modTotal = item.modifiers.reduce((ms, m) => ms + m.price, 0);
    return sum + (item.unitPrice + modTotal) * item.quantity;
  }, 0);
  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  const displayCategories = categories.length > 0 ? categories : demoCategories;

  return (
    <RequirePermission permission="orders">
    <MainLayout>
      <Header
        title="Toma de Pedido"
        subtitle={cart.tableName ? `Mesa: ${cart.tableName}` : 'Sin mesa asignada'}
        actions={
          <Button
            variant="ghost"
            size="sm"
            icon={<TableCellsIcon className="w-5 h-5" />}
            onClick={() => router.push('/mesas')}
          >
            Seleccionar Mesa
          </Button>
        }
      />

      <div className="flex-1 overflow-hidden flex">
        {/* LEFT: Menu */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-gray-100">
          {/* Search */}
          <div className="px-4 pt-3 pb-2">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Buscar producto..."
            />
          </div>

          {/* Category pills */}
          <div className="px-4 pb-2 overflow-x-auto scrollbar-hide">
            <div className="flex gap-2">
              {displayCategories.map((cat) => (
                <motion.button
                  key={cat.id}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    'min-h-[40px] px-4 py-2 rounded-xl font-semibold text-sm whitespace-nowrap',
                    'transition-all duration-150 touch-manipulation',
                    selectedCategory === cat.id
                      ? 'text-white shadow-sm'
                      : 'bg-white text-maki-gray hover:bg-gray-100'
                  )}
                  style={
                    selectedCategory === cat.id
                      ? { backgroundColor: cat.color || '#1B3A2D' }
                      : undefined
                  }
                >
                  {cat.name}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Course type tabs */}
          <div className="px-4 pb-2">
            <Tabs
              tabs={courseTypes.map((c) => ({ id: c.id, label: c.label }))}
              activeTab={selectedCourse}
              onChange={setSelectedCourse}
              variant="filled"
              size="sm"
            />
          </div>

          {/* Products Grid */}
          <div className="flex-1 overflow-y-auto scrollbar-thin px-4 pb-4">
            {isLoading ? (
              <PageLoader />
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-maki-gray">
                <p className="text-touch-lg">No se encontraron productos</p>
                <p className="text-sm mt-1">Intenta con otra categoria o busqueda</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAdd={handleAddProduct}
                    compact
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Cart */}
        <div className="w-[380px] flex flex-col bg-white">
          {/* Cart header */}
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCartIcon className="w-5 h-5 text-maki-gold" />
              <h2 className="text-touch-lg font-bold text-maki-dark">
                Orden
              </h2>
              {itemCount > 0 && (
                <span className="bg-maki-gold text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {itemCount}
                </span>
              )}
            </div>
            {cart.items.length > 0 && (
              <button
                onClick={cart.clearCart}
                className="min-w-[40px] min-h-[40px] flex items-center justify-center
                         rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600
                         transition-colors touch-manipulation"
              >
                <TrashIcon className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-2">
            {cart.items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-maki-gray">
                <ShoppingCartIcon className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-touch-base">Orden vacia</p>
                <p className="text-sm mt-1">Toca un producto para agregar</p>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {cart.items.map((item) => (
                  <motion.div
                    key={item.tempId}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    layout
                    className="py-3 border-b border-gray-50 last:border-0"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-maki-dark text-touch-base truncate">
                          {item.name}
                        </p>
                        {/* Modifiers */}
                        {item.modifiers.length > 0 && (
                          <div className="mt-0.5 space-y-0.5">
                            {item.modifiers.map((mod, idx) => (
                              <p key={idx} className="text-xs text-maki-gray">
                                + {mod.name} {mod.price > 0 && `(+${formatCurrency(mod.price)})`}
                              </p>
                            ))}
                          </div>
                        )}
                        {/* Notes */}
                        {item.notes && (
                          <p className="text-xs text-amber-600 mt-0.5 font-medium">
                            * {item.notes}
                          </p>
                        )}
                        {/* Price */}
                        <p className="text-sm text-maki-gold font-semibold mt-1">
                          {formatCurrency(
                            (item.unitPrice + item.modifiers.reduce((s, m) => s + m.price, 0)) * item.quantity
                          )}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Notes button */}
                        <button
                          onClick={() => {
                            setNotesItemId(item.tempId);
                            setShowNotes(true);
                          }}
                          className={cn(
                            'min-w-[36px] min-h-[36px] rounded-lg flex items-center justify-center',
                            'transition-colors touch-manipulation',
                            item.notes
                              ? 'bg-amber-50 text-amber-500'
                              : 'hover:bg-gray-100 text-gray-400'
                          )}
                        >
                          <ChatBubbleLeftIcon className="w-4 h-4" />
                        </button>

                        <QuantitySelector
                          value={item.quantity}
                          onChange={(q) => cart.updateQuantity(item.tempId, q)}
                          onDelete={() => cart.removeItem(item.tempId)}
                          size="sm"
                        />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>

          {/* Cart footer */}
          {cart.items.length > 0 && (
            <div className="px-4 py-4 border-t border-gray-100 space-y-3">
              {/* Subtotal */}
              <div className="flex items-center justify-between">
                <span className="text-maki-gray font-medium">Subtotal</span>
                <span className="text-touch-xl font-bold text-maki-dark">
                  {formatCurrency(subtotal)}
                </span>
              </div>

              {/* Send to kitchen button */}
              <Button
                variant="primary"
                size="xl"
                fullWidth
                icon={<PaperAirplaneIcon className="w-6 h-6" />}
                onClick={handleSendToKitchen}
              >
                Enviar a Cocina
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Modifiers Bottom Sheet */}
      <BottomSheet
        isOpen={showModifiers}
        onClose={() => setShowModifiers(false)}
        title={`Personalizar: ${pendingProduct?.name}`}
      >
        {pendingProduct?.modifierGroups?.map((group: ModifierGroup) => (
          <div key={group.id} className="mb-4">
            <h4 className="font-bold text-maki-dark mb-2">
              {group.name}
              {group.required && <span className="text-red-500 ml-1">*</span>}
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {group.modifiers.map((mod) => {
                const isSelected = selectedModifiers[group.id]?.includes(mod.id);
                return (
                  <motion.button
                    key={mod.id}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      setSelectedModifiers((prev) => {
                        const current = prev[group.id] || [];
                        if (isSelected) {
                          return { ...prev, [group.id]: current.filter((id) => id !== mod.id) };
                        }
                        if (group.maxSelections === 1) {
                          return { ...prev, [group.id]: [mod.id] };
                        }
                        if (current.length < group.maxSelections) {
                          return { ...prev, [group.id]: [...current, mod.id] };
                        }
                        return prev;
                      });
                    }}
                    className={cn(
                      'min-h-[48px] px-4 py-2 rounded-xl border-2 text-left transition-all touch-manipulation',
                      isSelected
                        ? 'border-maki-gold bg-maki-gold/10 text-maki-dark'
                        : 'border-gray-200 text-maki-gray hover:border-gray-300'
                    )}
                  >
                    <p className="font-medium text-sm">{mod.name}</p>
                    {mod.price > 0 && (
                      <p className="text-xs text-maki-gold">+{formatCurrency(mod.price)}</p>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>
        ))}
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={handleConfirmModifiers}
          className="mt-4"
        >
          Agregar al Pedido
        </Button>
      </BottomSheet>

      {/* Notes Bottom Sheet */}
      <BottomSheet
        isOpen={showNotes}
        onClose={() => { setShowNotes(false); setNotesItemId(null); }}
        title="Notas del Item"
      >
        <div className="grid grid-cols-2 gap-2">
          {presetNotes.map((note) => (
            <motion.button
              key={note}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleNoteSelect(note)}
              className="min-h-[48px] px-4 py-2 rounded-xl bg-maki-light text-maki-dark
                       font-medium text-sm hover:bg-maki-cream active:bg-maki-gold/20
                       transition-colors touch-manipulation text-left"
            >
              {note}
            </motion.button>
          ))}
        </div>
      </BottomSheet>
    </MainLayout>
    </RequirePermission>
  );
}
