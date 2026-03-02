import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding MakiCore database...');

  // ============================================================
  // ROLES
  // ============================================================
  const roles = await Promise.all([
    prisma.role.upsert({
      where: { name: 'owner' },
      update: {},
      create: {
        name: 'owner',
        displayName: 'Propietario',
        isSystem: true,
        permissions: {
          all: true,
        },
      },
    }),
    prisma.role.upsert({
      where: { name: 'admin' },
      update: {},
      create: {
        name: 'admin',
        displayName: 'Administrador',
        isSystem: true,
        permissions: {
          dashboard: true,
          users: { read: true, write: true },
          branches: { read: true, write: true },
          tables: { read: true, write: true },
          orders: { read: true, write: true, discount: true, cancel: true },
          products: { read: true, write: true },
          inventory: { read: true, write: true },
          reports: { read: true },
          cash: { read: true, write: true, close: true },
          customers: { read: true, write: true },
          reservations: { read: true, write: true },
          settings: { read: true, write: true },
        },
      },
    }),
    prisma.role.upsert({
      where: { name: 'cashier' },
      update: {},
      create: {
        name: 'cashier',
        displayName: 'Cajero',
        isSystem: true,
        permissions: {
          orders: { read: true, write: true, pay: true },
          cash: { read: true, write: true, close: true },
          customers: { read: true, write: true },
          products: { read: true },
        },
      },
    }),
    prisma.role.upsert({
      where: { name: 'server' },
      update: {},
      create: {
        name: 'server',
        displayName: 'Mesero',
        isSystem: true,
        permissions: {
          tables: { read: true, write: true },
          orders: { read: true, write: true },
          products: { read: true },
          customers: { read: true },
        },
      },
    }),
    prisma.role.upsert({
      where: { name: 'chef' },
      update: {},
      create: {
        name: 'chef',
        displayName: 'Chef',
        isSystem: true,
        permissions: {
          kds: { read: true, write: true },
          orders: { read: true },
          products: { read: true },
          inventory: { read: true },
          recipes: { read: true, write: true },
        },
      },
    }),
    prisma.role.upsert({
      where: { name: 'hostess' },
      update: {},
      create: {
        name: 'hostess',
        displayName: 'Hostess',
        isSystem: true,
        permissions: {
          tables: { read: true },
          reservations: { read: true, write: true },
          customers: { read: true, write: true },
        },
      },
    }),
    prisma.role.upsert({
      where: { name: 'bartender' },
      update: {},
      create: {
        name: 'bartender',
        displayName: 'Bartender',
        isSystem: true,
        permissions: {
          kds: { read: true, write: true },
          orders: { read: true },
          products: { read: true },
        },
      },
    }),
  ]);

  const adminRole = roles[1];
  const cashierRole = roles[2];
  const serverRole = roles[3];
  const kitchenRole = roles[4]; // chef
  const bartenderRole = roles[6];
  console.log(`Created ${roles.length} roles`);

  // ============================================================
  // BRANCH
  // ============================================================
  const branch = await prisma.branch.upsert({
    where: { id: '2d7cb4d6-37cc-460c-a963-90c37f61c15f' },
    update: {},
    create: {
      id: '2d7cb4d6-37cc-460c-a963-90c37f61c15f',
      name: 'Makiavelo Principal',
      address: 'Av. Principal #123, Zona Gastronómica',
      phone: '+52 55 1234 5678',
      email: 'principal@makiavelo.com',
      currency: 'USD',
      timezone: 'America/Mexico_City',
      settings: {
        brandColors: {
          darkGreen: '#1B3A2D',
          orangeGold: '#D4842A',
          cream: '#F5E6C8',
        },
        taxRate: 0.16,
        tipSuggestions: [10, 15, 20],
        autoCloseOrders: false,
      },
    },
  });
  console.log('Created branch: Makiavelo Principal');

  // ============================================================
  // ADMIN USER
  // ============================================================
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@makiavelo.com' },
    update: {},
    create: {
      email: 'admin@makiavelo.com',
      password: hashedPassword,
      pin: '1234',
      firstName: 'Admin',
      lastName: 'Makiavelo',
      phone: '+52 55 0000 0000',
      roleId: adminRole.id,
      branchId: branch.id,
    },
  });
  console.log('Created admin user: admin@makiavelo.com');

  // ============================================================
  // STAFF USERS
  // ============================================================
  const staffPassword = await bcrypt.hash('staff123', 10);
  const staffUsers = [
    { email: 'carlos@makiavelo.com', firstName: 'Carlos', lastName: 'Lopez', pin: '1111', roleId: serverRole.id, phone: '+507 6001-0001' },
    { email: 'maria@makiavelo.com', firstName: 'Maria', lastName: 'Garcia', pin: '2222', roleId: serverRole.id, phone: '+507 6001-0002' },
    { email: 'pedro@makiavelo.com', firstName: 'Pedro', lastName: 'Ruiz', pin: '3333', roleId: kitchenRole.id, phone: '+507 6001-0003' },
    { email: 'ana@makiavelo.com', firstName: 'Ana', lastName: 'Torres', pin: '4444', roleId: serverRole.id, phone: '+507 6001-0004' },
    { email: 'luis@makiavelo.com', firstName: 'Luis', lastName: 'Herrera', pin: '5555', roleId: bartenderRole.id, phone: '+507 6001-0005' },
    { email: 'sofia@makiavelo.com', firstName: 'Sofia', lastName: 'Mendez', pin: '6666', roleId: cashierRole.id, phone: '+507 6001-0006' },
  ];
  for (const s of staffUsers) {
    await prisma.user.upsert({
      where: { email: s.email },
      update: {},
      create: {
        email: s.email,
        password: staffPassword,
        pin: s.pin,
        firstName: s.firstName,
        lastName: s.lastName,
        phone: s.phone,
        roleId: s.roleId,
        branchId: branch.id,
      },
    });
  }
  console.log(`Created ${staffUsers.length} staff users`);

  // ============================================================
  // ZONES
  // ============================================================
  const zones = await Promise.all([
    prisma.zone.create({
      data: {
        name: 'Salon Principal',
        branchId: branch.id,
        color: '#1B3A2D',
        sortOrder: 1,
      },
    }),
    prisma.zone.create({
      data: {
        name: 'Terraza',
        branchId: branch.id,
        color: '#D4842A',
        sortOrder: 2,
      },
    }),
    prisma.zone.create({
      data: {
        name: 'Bar',
        branchId: branch.id,
        color: '#8B4513',
        sortOrder: 3,
      },
    }),
    prisma.zone.create({
      data: {
        name: 'VIP',
        branchId: branch.id,
        color: '#C9A96E',
        sortOrder: 4,
      },
    }),
  ]);
  console.log(`Created ${zones.length} zones`);

  // ============================================================
  // TABLES - All 2-seat round (user merges/splits as needed)
  // ============================================================
  const tables: any[] = [];
  // Salon Principal: Tables 1-18
  for (let i = 1; i <= 18; i++) {
    tables.push(
      prisma.table.create({
        data: {
          number: i,
          name: `Mesa ${i}`,
          seats: 2,
          zoneId: zones[0].id,
          posX: ((i - 1) % 6) * 120 + 80,
          posY: Math.floor((i - 1) / 6) * 140 + 100,
          shape: 'round',
        },
      }),
    );
  }
  // Terraza: Tables 19-28
  for (let i = 19; i <= 28; i++) {
    tables.push(
      prisma.table.create({
        data: {
          number: i,
          name: `Mesa ${i}`,
          seats: 2,
          zoneId: zones[1].id,
          posX: ((i - 19) % 4) * 120 + 780,
          posY: Math.floor((i - 19) / 4) * 140 + 100,
          shape: 'round',
        },
      }),
    );
  }
  // Bar: Tables 29-33
  for (let i = 29; i <= 33; i++) {
    tables.push(
      prisma.table.create({
        data: {
          number: i,
          name: `Barra ${i - 28}`,
          seats: 2,
          zoneId: zones[2].id,
          posX: (i - 29) * 180 + 80,
          posY: 700,
          shape: 'bar',
        },
      }),
    );
  }
  // VIP: Tables 34-39
  for (let i = 34; i <= 39; i++) {
    tables.push(
      prisma.table.create({
        data: {
          number: i,
          name: `VIP ${i - 33}`,
          seats: 2,
          zoneId: zones[3].id,
          posX: ((i - 34) % 4) * 120 + 780,
          posY: Math.floor((i - 34) / 4) * 120 + 540,
          shape: 'round',
        },
      }),
    );
  }
  await Promise.all(tables);
  console.log('Created 39 tables');

  // ============================================================
  // SHIFTS
  // ============================================================
  await Promise.all([
    prisma.shift.create({
      data: {
        name: 'Almuerzo',
        type: 'AFTERNOON',
        startTime: '11:00',
        endTime: '17:00',
        branchId: branch.id,
      },
    }),
    prisma.shift.create({
      data: {
        name: 'Cena',
        type: 'EVENING',
        startTime: '17:00',
        endTime: '00:00',
        branchId: branch.id,
      },
    }),
  ]);
  console.log('Created 2 shifts');

  // ============================================================
  // CASH REGISTER
  // ============================================================
  await prisma.cashRegister.create({
    data: {
      name: 'Caja Principal',
      branchId: branch.id,
    },
  });
  console.log('Created 1 cash register');

  // ============================================================
  // CATEGORIES
  // ============================================================
  const categories = await Promise.all([
    prisma.category.create({
      data: { name: 'Entradas', color: '#E8A87C', icon: 'utensils', sortOrder: 1, branchId: branch.id },
    }),
    prisma.category.create({
      data: { name: 'Sushi Rolls', color: '#D4842A', icon: 'fish', sortOrder: 2, branchId: branch.id },
    }),
    prisma.category.create({
      data: { name: 'Sashimi', color: '#E85D75', icon: 'fish', sortOrder: 3, branchId: branch.id },
    }),
    prisma.category.create({
      data: { name: 'Ceviches', color: '#41B3A3', icon: 'lemon', sortOrder: 4, branchId: branch.id },
    }),
    prisma.category.create({
      data: { name: 'Platos Fuertes', color: '#1B3A2D', icon: 'plate-wheat', sortOrder: 5, branchId: branch.id },
    }),
    prisma.category.create({
      data: { name: 'Parrilla', color: '#8B4513', icon: 'fire', sortOrder: 6, branchId: branch.id },
    }),
    prisma.category.create({
      data: { name: 'Postres', color: '#F5E6C8', icon: 'cake-candles', sortOrder: 7, branchId: branch.id },
    }),
    prisma.category.create({
      data: { name: 'Bebidas', color: '#85C1E9', icon: 'glass-water', sortOrder: 8, branchId: branch.id },
    }),
    prisma.category.create({
      data: { name: 'Cocteles', color: '#C39BD3', icon: 'martini-glass', sortOrder: 9, branchId: branch.id },
    }),
    prisma.category.create({
      data: { name: 'Vinos', color: '#922B21', icon: 'wine-glass', sortOrder: 10, branchId: branch.id },
    }),
  ]);
  console.log(`Created ${categories.length} categories`);

  // ============================================================
  // PRODUCTS (~30)
  // ============================================================
  const products = await Promise.all([
    // Entradas
    prisma.product.create({
      data: { name: 'Edamame con sal de mar', price: 6.50, cost: 1.80, categoryId: categories[0].id, branchId: branch.id, station: 'cocina-fria', preparationTime: 5 },
    }),
    prisma.product.create({
      data: { name: 'Gyozas de cerdo (6 pzas)', price: 9.00, cost: 3.00, categoryId: categories[0].id, branchId: branch.id, station: 'cocina-caliente', preparationTime: 12 },
    }),
    prisma.product.create({
      data: { name: 'Tiradito de atun', price: 14.00, cost: 5.50, categoryId: categories[0].id, branchId: branch.id, station: 'cocina-fria', preparationTime: 8 },
    }),
    // Sushi Rolls
    prisma.product.create({
      data: { name: 'Makiavelo Roll', description: 'Salmon, aguacate, queso crema, tempura, salsa de anguila', price: 16.50, cost: 6.00, categoryId: categories[1].id, branchId: branch.id, station: 'sushi', preparationTime: 15 },
    }),
    prisma.product.create({
      data: { name: 'Dragon Roll', description: 'Camaron tempura, aguacate, anguila, salsa teriyaki', price: 18.00, cost: 7.00, categoryId: categories[1].id, branchId: branch.id, station: 'sushi', preparationTime: 15 },
    }),
    prisma.product.create({
      data: { name: 'Spicy Tuna Roll', description: 'Atun picante, pepino, ajonjoli', price: 14.00, cost: 5.00, categoryId: categories[1].id, branchId: branch.id, station: 'sushi', preparationTime: 12 },
    }),
    prisma.product.create({
      data: { name: 'California Roll', description: 'Cangrejo, aguacate, pepino, ajonjoli', price: 12.00, cost: 4.00, categoryId: categories[1].id, branchId: branch.id, station: 'sushi', preparationTime: 10 },
    }),
    prisma.product.create({
      data: { name: 'Philadelphia Roll', description: 'Salmon, queso crema, aguacate', price: 13.50, cost: 4.50, categoryId: categories[1].id, branchId: branch.id, station: 'sushi', preparationTime: 10 },
    }),
    // Sashimi
    prisma.product.create({
      data: { name: 'Sashimi de salmon (8 cortes)', price: 16.00, cost: 7.00, categoryId: categories[2].id, branchId: branch.id, station: 'sushi', preparationTime: 8 },
    }),
    prisma.product.create({
      data: { name: 'Sashimi de atun (8 cortes)', price: 18.00, cost: 8.00, categoryId: categories[2].id, branchId: branch.id, station: 'sushi', preparationTime: 8 },
    }),
    prisma.product.create({
      data: { name: 'Sashimi mixto (12 cortes)', price: 24.00, cost: 10.00, categoryId: categories[2].id, branchId: branch.id, station: 'sushi', preparationTime: 10 },
    }),
    // Ceviches
    prisma.product.create({
      data: { name: 'Ceviche clasico', description: 'Pescado del dia, limon, cebolla, cilantro, aguacate', price: 13.00, cost: 4.50, categoryId: categories[3].id, branchId: branch.id, station: 'cocina-fria', preparationTime: 10 },
    }),
    prisma.product.create({
      data: { name: 'Ceviche Nikkei', description: 'Atun, leche de tigre, aji amarillo, camote', price: 16.00, cost: 6.00, categoryId: categories[3].id, branchId: branch.id, station: 'cocina-fria', preparationTime: 12 },
    }),
    // Platos Fuertes
    prisma.product.create({
      data: { name: 'Ramen de cerdo tonkotsu', price: 15.00, cost: 5.00, categoryId: categories[4].id, branchId: branch.id, station: 'cocina-caliente', preparationTime: 20 },
    }),
    prisma.product.create({
      data: { name: 'Pad Thai de camarones', price: 16.00, cost: 5.50, categoryId: categories[4].id, branchId: branch.id, station: 'cocina-caliente', preparationTime: 18 },
    }),
    prisma.product.create({
      data: { name: 'Teriyaki de pollo', price: 14.50, cost: 4.50, categoryId: categories[4].id, branchId: branch.id, station: 'cocina-caliente', preparationTime: 20 },
    }),
    prisma.product.create({
      data: { name: 'Salmon a la plancha', description: 'Con pure de camote y verduras salteadas', price: 22.00, cost: 9.00, categoryId: categories[4].id, branchId: branch.id, station: 'cocina-caliente', preparationTime: 18 },
    }),
    // Parrilla
    prisma.product.create({
      data: { name: 'Ribeye 350g', description: 'Con papas rostizadas y ensalada', price: 32.00, cost: 14.00, categoryId: categories[5].id, branchId: branch.id, station: 'parrilla', preparationTime: 25 },
    }),
    prisma.product.create({
      data: { name: 'Filete de res 250g', description: 'Con guarnicion del dia', price: 28.00, cost: 12.00, categoryId: categories[5].id, branchId: branch.id, station: 'parrilla', preparationTime: 22 },
    }),
    prisma.product.create({
      data: { name: 'Brochetas de camaron', description: 'Marinados en chimichurri con arroz', price: 19.00, cost: 7.50, categoryId: categories[5].id, branchId: branch.id, station: 'parrilla', preparationTime: 18 },
    }),
    // Postres
    prisma.product.create({
      data: { name: 'Mochi helado (3 pzas)', price: 8.00, cost: 2.50, categoryId: categories[6].id, branchId: branch.id, station: 'cocina-fria', preparationTime: 3 },
    }),
    prisma.product.create({
      data: { name: 'Cheesecake de matcha', price: 9.50, cost: 3.00, categoryId: categories[6].id, branchId: branch.id, station: 'cocina-fria', preparationTime: 5 },
    }),
    prisma.product.create({
      data: { name: 'Tempura de platano con helado', price: 8.50, cost: 2.00, categoryId: categories[6].id, branchId: branch.id, station: 'cocina-caliente', preparationTime: 8 },
    }),
    // Bebidas
    prisma.product.create({
      data: { name: 'Agua natural', price: 2.50, cost: 0.50, categoryId: categories[7].id, branchId: branch.id, station: 'barra', preparationTime: 1 },
    }),
    prisma.product.create({
      data: { name: 'Limonada natural', price: 4.00, cost: 1.00, categoryId: categories[7].id, branchId: branch.id, station: 'barra', preparationTime: 3 },
    }),
    prisma.product.create({
      data: { name: 'Te verde japones', price: 3.50, cost: 0.80, categoryId: categories[7].id, branchId: branch.id, station: 'barra', preparationTime: 3 },
    }),
    // Cocteles
    prisma.product.create({
      data: { name: 'Sake Sangria', description: 'Sake, frutas de temporada, soda', price: 10.00, cost: 3.50, categoryId: categories[8].id, branchId: branch.id, station: 'barra', preparationTime: 5 },
    }),
    prisma.product.create({
      data: { name: 'Margarita de yuzu', price: 11.00, cost: 3.00, categoryId: categories[8].id, branchId: branch.id, station: 'barra', preparationTime: 5 },
    }),
    prisma.product.create({
      data: { name: 'Old Fashioned japones', description: 'Whisky japones, bitters, naranja', price: 13.00, cost: 4.50, categoryId: categories[8].id, branchId: branch.id, station: 'barra', preparationTime: 5 },
    }),
    // Vinos
    prisma.product.create({
      data: { name: 'Copa de vino tinto (casa)', price: 8.00, cost: 2.50, categoryId: categories[9].id, branchId: branch.id, station: 'barra', preparationTime: 2 },
    }),
    prisma.product.create({
      data: { name: 'Copa de vino blanco (casa)', price: 8.00, cost: 2.50, categoryId: categories[9].id, branchId: branch.id, station: 'barra', preparationTime: 2 },
    }),
  ]);
  console.log(`Created ${products.length} products`);

  // ============================================================
  // MODIFIERS
  // ============================================================
  const modTermino = await prisma.modifier.create({
    data: {
      name: 'Termino de carne',
      isRequired: true,
      minSelections: 1,
      maxSelections: 1,
      options: {
        create: [
          { name: 'Raro', price: 0, sortOrder: 1 },
          { name: 'Medio', price: 0, sortOrder: 2 },
          { name: 'Tres cuartos', price: 0, sortOrder: 3 },
          { name: 'Bien cocido', price: 0, sortOrder: 4 },
        ],
      },
    },
  });

  const modExtras = await prisma.modifier.create({
    data: {
      name: 'Extras',
      isRequired: false,
      minSelections: 0,
      maxSelections: 5,
      options: {
        create: [
          { name: 'Aguacate', price: 2.50, sortOrder: 1 },
          { name: 'Queso crema', price: 1.50, sortOrder: 2 },
          { name: 'Camaron extra', price: 3.00, sortOrder: 3 },
          { name: 'Salmon extra', price: 3.50, sortOrder: 4 },
          { name: 'Salsa picante', price: 0, sortOrder: 5 },
        ],
      },
    },
  });

  const modSin = await prisma.modifier.create({
    data: {
      name: 'Sin ingrediente',
      isRequired: false,
      minSelections: 0,
      maxSelections: 5,
      options: {
        create: [
          { name: 'Sin cebolla', price: 0, sortOrder: 1 },
          { name: 'Sin cilantro', price: 0, sortOrder: 2 },
          { name: 'Sin picante', price: 0, sortOrder: 3 },
          { name: 'Sin gluten', price: 0, sortOrder: 4 },
          { name: 'Sin lacteos', price: 0, sortOrder: 5 },
        ],
      },
    },
  });
  console.log('Created 3 modifiers with options');

  // Link modifiers to products: Termino de carne -> parrilla products
  const parrillaProducts = products.filter((p) => p.station === 'parrilla');
  for (const product of parrillaProducts) {
    await prisma.productModifier.create({
      data: { productId: product.id, modifierId: modTermino.id },
    });
  }

  // Link extras and sin to sushi rolls
  const sushiProducts = products.filter((p) => p.station === 'sushi');
  for (const product of sushiProducts) {
    await prisma.productModifier.create({
      data: { productId: product.id, modifierId: modExtras.id },
    });
    await prisma.productModifier.create({
      data: { productId: product.id, modifierId: modSin.id },
    });
  }
  console.log('Linked modifiers to products');

  // ============================================================
  // SAMPLE CUSTOMERS
  // ============================================================
  await Promise.all([
    prisma.customer.upsert({
      where: { email: 'carlos@email.com' },
      update: {},
      create: {
        firstName: 'Carlos',
        lastName: 'Rodriguez',
        email: 'carlos@email.com',
        phone: '+52 55 1111 2222',
        totalVisits: 12,
        totalSpent: 450.00,
      },
    }),
    prisma.customer.upsert({
      where: { email: 'maria.g@email.com' },
      update: {},
      create: {
        firstName: 'Maria',
        lastName: 'Gonzalez',
        email: 'maria.g@email.com',
        phone: '+52 55 3333 4444',
        totalVisits: 8,
        totalSpent: 320.00,
      },
    }),
    prisma.customer.upsert({
      where: { email: 'rlopez@empresa.com' },
      update: {},
      create: {
        firstName: 'Roberto',
        lastName: 'Lopez',
        email: 'rlopez@empresa.com',
        phone: '+52 55 5555 6666',
        taxId: 'LOPR850101ABC',
        businessName: 'Empresa Lopez SA',
        totalVisits: 5,
        totalSpent: 890.00,
      },
    }),
  ]);
  console.log('Created 3 sample customers');

  // ============================================================
  // SAMPLE SUPPLIES
  // ============================================================
  try {
    const supplyCount = await prisma.supply.count();
    if (supplyCount === 0) {
      await Promise.all([
        prisma.supply.create({ data: { name: 'Salmon fresco', unit: 'kg', currentStock: 15, minStock: 5, costPerUnit: 18.00 } }),
        prisma.supply.create({ data: { name: 'Atun fresco', unit: 'kg', currentStock: 10, minStock: 3, costPerUnit: 22.00 } }),
        prisma.supply.create({ data: { name: 'Arroz para sushi', unit: 'kg', currentStock: 25, minStock: 10, costPerUnit: 3.50 } }),
        prisma.supply.create({ data: { name: 'Aguacate', unit: 'pza', currentStock: 30, minStock: 10, costPerUnit: 1.20 } }),
        prisma.supply.create({ data: { name: 'Queso crema', unit: 'kg', currentStock: 8, minStock: 3, costPerUnit: 6.00 } }),
        prisma.supply.create({ data: { name: 'Nori (alga)', unit: 'paquete', currentStock: 20, minStock: 5, costPerUnit: 4.50 } }),
        prisma.supply.create({ data: { name: 'Camaron grande', unit: 'kg', currentStock: 12, minStock: 4, costPerUnit: 15.00 } }),
        prisma.supply.create({ data: { name: 'Ribeye', unit: 'kg', currentStock: 8, minStock: 3, costPerUnit: 28.00 } }),
        prisma.supply.create({ data: { name: 'Sake', unit: 'botella', currentStock: 10, minStock: 3, costPerUnit: 12.00 } }),
        prisma.supply.create({ data: { name: 'Salsa de soya', unit: 'litro', currentStock: 5, minStock: 2, costPerUnit: 3.00 } }),
      ]);
      console.log('Created 10 sample supplies');
    } else {
      console.log('Supplies already exist, skipping');
    }
  } catch { console.log('Supplies already exist, skipping'); }

  // ============================================================
  // SAMPLE SUPPLIER
  // ============================================================
  try {
    const supplierCount = await prisma.supplier.count();
    if (supplierCount === 0) {
      await prisma.supplier.create({
        data: {
          name: 'Pescaderia del Pacifico',
          contactName: 'Juan Pescador',
          email: 'ventas@pescaderiapacifico.com',
          phone: '+52 33 9999 8888',
          address: 'Central de Abastos, Local 42',
        },
      });
      await prisma.supplier.create({
        data: {
          name: 'Distribuidora Asiatica',
          contactName: 'Li Wei',
          email: 'contacto@distasiatica.com',
          phone: '+52 55 7777 6666',
          address: 'Barrio Chino, Local 15',
        },
      });
      console.log('Created 2 suppliers');
    } else {
      console.log('Suppliers already exist, skipping');
    }
  } catch { console.log('Suppliers already exist, skipping'); }

  console.log('\nSeed completed successfully!');
  console.log('Login with: admin@makiavelo.com / admin123 (PIN: 1234)');
  console.log('Staff PINs: Carlos=1111, Maria=2222, Pedro=3333, Ana=4444, Luis=5555, Sofia=6666');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
