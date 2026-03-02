import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import appConfig from './config/app.config';
import { PrismaModule } from './database/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { BranchesModule } from './modules/branches/branches.module';
import { TablesModule } from './modules/tables/tables.module';
import { CashModule } from './modules/cash/cash.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { ProductsModule } from './modules/products/products.module';
import { OrdersModule } from './modules/orders/orders.module';
import { KdsModule } from './modules/kds/kds.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { SuppliesModule } from './modules/supplies/supplies.module';
import { RecipesModule } from './modules/recipes/recipes.module';
import { CustomersModule } from './modules/customers/customers.module';
import { ReservationsModule } from './modules/reservations/reservations.module';
import { ReportsModule } from './modules/reports/reports.module';
import { AlertsModule } from './modules/alerts/alerts.module';
import { AuditModule } from './modules/audit/audit.module';
import { EventsGatewayModule } from './gateway/events-gateway.module';
import { ZonesModule } from './modules/zones/zones.module';
import { ShiftsModule } from './modules/shifts/shifts.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { PurchasesModule } from './modules/purchases/purchases.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    RolesModule,
    BranchesModule,
    ZonesModule,
    TablesModule,
    ShiftsModule,
    CashModule,
    CategoriesModule,
    ProductsModule,
    OrdersModule,
    KdsModule,
    PaymentsModule,
    InvoicesModule,
    InventoryModule,
    SuppliesModule,
    RecipesModule,
    SuppliersModule,
    PurchasesModule,
    CustomersModule,
    ReservationsModule,
    ReportsModule,
    AlertsModule,
    AuditModule,
    EventsGatewayModule,
  ],
})
export class AppModule {}
