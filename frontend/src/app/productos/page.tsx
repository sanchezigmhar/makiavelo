'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PlusIcon,
  PencilSquareIcon,
  EyeSlashIcon,
  EyeIcon,
  TagIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';
import MainLayout from '@/components/layout/MainLayout';
import Header from '@/components/layout/Header';
import SearchBar from '@/components/ui/SearchBar';
import Tabs from '@/components/ui/Tabs';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Toggle from '@/components/ui/Toggle';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { cn, formatCurrency } from '@/lib/utils';
import type { Product, Category } from '@/types';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import RequirePermission from '@/components/common/RequirePermission';

export default function ProductosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  // Demo data
  const demoCategories: Category[] = [
    { id: 'all', name: 'Todos', slug: 'all', sortOrder: 0, isActive: true },
    { id: 'sushi', name: 'Sushi Rolls', slug: 'sushi', sortOrder: 1, isActive: true, productCount: 8 },
    { id: 'sashimi', name: 'Sashimi', slug: 'sashimi', sortOrder: 2, isActive: true, productCount: 5 },
    { id: 'entradas', name: 'Entradas', slug: 'entradas', sortOrder: 3, isActive: true, productCount: 6 },
    { id: 'principales', name: 'Principales', slug: 'principales', sortOrder: 4, isActive: true, productCount: 7 },
    { id: 'postres', name: 'Postres', slug: 'postres', sortOrder: 5, isActive: true, productCount: 4 },
    { id: 'bebidas', name: 'Bebidas', slug: 'bebidas', sortOrder: 6, isActive: true, productCount: 10 },
  ];

  const demoProducts: Product[] = [
    { id: 'p1', name: 'Dragon Roll', description: 'Tempura shrimp, aguacate, anguila glaseada', categoryId: 'sushi', price: 18.50, cost: 6.20, courseType: 'PLATO_FUERTE', station: 'sushi-bar', isAvailable: true, isActive: true, sortOrder: 1, sku: 'SR-001' },
    { id: 'p2', name: 'Salmon Roll', description: 'Salmon fresco, queso crema, pepino', categoryId: 'sushi', price: 14.00, cost: 4.50, courseType: 'PLATO_FUERTE', station: 'sushi-bar', isAvailable: true, isActive: true, sortOrder: 2, sku: 'SR-002' },
    { id: 'p3', name: 'Rainbow Roll', description: 'Variedad de pescados sobre california roll', categoryId: 'sushi', price: 22.00, cost: 8.00, courseType: 'PLATO_FUERTE', station: 'sushi-bar', isAvailable: true, isActive: true, sortOrder: 3, sku: 'SR-003' },
    { id: 'p4', name: 'Sashimi Salmon', description: '8 cortes de salmon fresco', categoryId: 'sashimi', price: 24.00, cost: 10.00, courseType: 'PLATO_FUERTE', station: 'sushi-bar', isAvailable: true, isActive: true, sortOrder: 1, sku: 'SA-001' },
    { id: 'p5', name: 'Edamame', description: 'Vainas de soja con sal de mar', categoryId: 'entradas', price: 8.00, cost: 1.50, courseType: 'ENTRADA', station: 'cocina-fria', isAvailable: true, isActive: true, sortOrder: 1, sku: 'EN-001' },
    { id: 'p6', name: 'Gyoza (6 pcs)', description: 'Empanadas japonesas de cerdo', categoryId: 'entradas', price: 12.00, cost: 3.50, courseType: 'ENTRADA', station: 'cocina-caliente', isAvailable: true, isActive: true, sortOrder: 2, sku: 'EN-002' },
    { id: 'p7', name: 'Wagyu Tataki', description: 'Wagyu sellado con salsa ponzu', categoryId: 'principales', price: 38.00, cost: 18.00, courseType: 'PLATO_FUERTE', station: 'cocina-caliente', isAvailable: true, isActive: true, sortOrder: 1, sku: 'PL-001' },
    { id: 'p8', name: 'Teriyaki Chicken', description: 'Pollo glaseado con teriyaki artesanal', categoryId: 'principales', price: 20.00, cost: 5.50, courseType: 'PLATO_FUERTE', station: 'cocina-caliente', isAvailable: false, isActive: true, sortOrder: 2, sku: 'PL-002' },
    { id: 'p9', name: 'Mochi Ice Cream', description: 'Tres sabores de mochi', categoryId: 'postres', price: 9.00, cost: 2.50, courseType: 'POSTRE', station: 'postres', isAvailable: true, isActive: true, sortOrder: 1, sku: 'PO-001' },
    { id: 'p10', name: 'Sake Copa', description: 'Sake premium servido frio', categoryId: 'bebidas', price: 8.00, cost: 2.00, courseType: 'BEBIDA', station: 'bar', isAvailable: true, isActive: true, sortOrder: 1, sku: 'BE-001' },
    { id: 'p11', name: 'Asahi Beer', description: 'Cerveza japonesa premium', categoryId: 'bebidas', price: 6.00, cost: 1.80, courseType: 'BEBIDA', station: 'bar', isAvailable: true, isActive: true, sortOrder: 2, sku: 'BE-002' },
    { id: 'p12', name: 'Te Verde', description: 'Te verde japones organico', categoryId: 'bebidas', price: 4.00, cost: 0.50, courseType: 'BEBIDA', station: 'bar', isAvailable: true, isActive: true, sortOrder: 3, sku: 'BE-003' },
  ];

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [catRes, prodRes] = await Promise.allSettled([
          api.get('/categories'),
          api.get('/products?limit=200'),
        ]);
        if (catRes.status === 'fulfilled') setCategories([{ id: 'all', name: 'Todos', slug: 'all', sortOrder: 0, isActive: true }, ...catRes.value.data]);
        else setCategories(demoCategories);
        if (prodRes.status === 'fulfilled') setProducts(prodRes.value.data.data || prodRes.value.data);
        else setProducts(demoProducts);
      } catch {
        setCategories(demoCategories);
        setProducts(demoProducts);
      }
      setIsLoading(false);
    };
    fetchData();
  }, []);

  const displayProducts = products.length > 0 ? products : demoProducts;
  const displayCategories = categories.length > 0 ? categories : demoCategories;

  const filteredProducts = useMemo(() => {
    let result = displayProducts;
    if (selectedCategory !== 'all') {
      result = result.filter((p) => p.categoryId === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [displayProducts, selectedCategory, searchQuery]);

  const toggleAvailability = async (product: Product) => {
    try {
      await api.patch(`/products/${product.id}`, { isAvailable: !product.isAvailable });
      setProducts((prev) => prev.map((p) =>
        p.id === product.id ? { ...p, isAvailable: !p.isAvailable } : p
      ));
      toast.success(product.isAvailable ? 'Producto marcado como no disponible' : 'Producto disponible');
    } catch {
      setProducts((prev) => prev.map((p) =>
        p.id === product.id ? { ...p, isAvailable: !p.isAvailable } : p
      ));
      toast.success(product.isAvailable ? 'No disponible' : 'Disponible');
    }
  };

  return (
    <RequirePermission permission="products">
    <MainLayout>
      <Header
        title="Productos"
        subtitle={`${filteredProducts.length} productos`}
        actions={
          <Button variant="primary" size="md" icon={<PlusIcon className="w-5 h-5" />}>
            Nuevo Producto
          </Button>
        }
      />

      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Filters */}
        <div className="px-6 pt-4 pb-2 space-y-3">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Buscar por nombre, SKU..."
          />
          <Tabs
            tabs={displayCategories.map((c) => ({
              id: c.id,
              label: c.name,
              count: c.productCount,
            }))}
            activeTab={selectedCategory}
            onChange={setSelectedCategory}
            variant="pills"
            size="sm"
          />
        </div>

        {/* Product list */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-6 pb-6">
          {isLoading ? (
            <PageLoader />
          ) : (
            <div className="space-y-2">
              {filteredProducts.map((product) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={cn(
                    'flex items-center gap-4 p-4 bg-white rounded-2xl shadow-card',
                    'transition-all duration-150',
                    !product.isAvailable && 'opacity-60'
                  )}
                >
                  {/* Image */}
                  <div className="w-16 h-16 rounded-xl bg-maki-cream/50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl">
                        {product.courseType === 'BEBIDA' ? '🍵' : product.courseType === 'POSTRE' ? '🍮' : '🍣'}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-maki-dark truncate">{product.name}</h3>
                      {product.sku && (
                        <span className="text-xs text-maki-gray bg-gray-100 px-2 py-0.5 rounded">
                          {product.sku}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-maki-gray truncate mt-0.5">{product.description}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="font-bold text-maki-gold">{formatCurrency(product.price)}</span>
                      {product.cost && (
                        <span className="text-xs text-maki-gray">
                          Costo: {formatCurrency(product.cost)}
                        </span>
                      )}
                      <Badge
                        variant={product.isAvailable ? 'success' : 'danger'}
                        size="sm"
                      >
                        {product.isAvailable ? 'Disponible' : 'No disponible'}
                      </Badge>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => toggleAvailability(product)}
                      className={cn(
                        'min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center',
                        'transition-colors touch-manipulation',
                        product.isAvailable
                          ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                          : 'bg-red-50 text-red-600 hover:bg-red-100'
                      )}
                    >
                      {product.isAvailable ? (
                        <EyeIcon className="w-5 h-5" />
                      ) : (
                        <EyeSlashIcon className="w-5 h-5" />
                      )}
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => { setSelectedProduct(product); setShowDetail(true); }}
                      className="min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center
                               bg-gray-100 text-maki-gray hover:bg-gray-200 transition-colors touch-manipulation"
                    >
                      <PencilSquareIcon className="w-5 h-5" />
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Product Detail Modal */}
      <Modal
        isOpen={showDetail}
        onClose={() => setShowDetail(false)}
        title={selectedProduct?.name || 'Producto'}
        size="md"
      >
        {selectedProduct && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-maki-gray">SKU</p>
                <p className="font-semibold text-maki-dark">{selectedProduct.sku || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-maki-gray">Categoria</p>
                <p className="font-semibold text-maki-dark">{selectedProduct.category?.name || selectedProduct.categoryId}</p>
              </div>
              <div>
                <p className="text-sm text-maki-gray">Precio</p>
                <p className="font-bold text-maki-gold text-touch-lg">{formatCurrency(selectedProduct.price)}</p>
              </div>
              <div>
                <p className="text-sm text-maki-gray">Costo</p>
                <p className="font-semibold text-maki-dark">{formatCurrency(selectedProduct.cost || 0)}</p>
              </div>
              <div>
                <p className="text-sm text-maki-gray">Margen</p>
                <p className="font-semibold text-emerald-600">
                  {selectedProduct.cost
                    ? `${(((selectedProduct.price - selectedProduct.cost) / selectedProduct.price) * 100).toFixed(1)}%`
                    : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-maki-gray">Estacion</p>
                <p className="font-semibold text-maki-dark">{selectedProduct.station || 'N/A'}</p>
              </div>
            </div>
            {selectedProduct.description && (
              <div>
                <p className="text-sm text-maki-gray">Descripcion</p>
                <p className="text-maki-dark">{selectedProduct.description}</p>
              </div>
            )}
            <div className="flex items-center justify-between p-3 bg-maki-light rounded-xl">
              <span className="font-medium text-maki-dark">Disponible</span>
              <Toggle
                checked={selectedProduct.isAvailable}
                onChange={() => toggleAvailability(selectedProduct)}
              />
            </div>
          </div>
        )}
      </Modal>
    </MainLayout>
    </RequirePermission>
  );
}
