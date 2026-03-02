import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:4000',
    credentials: true,
  },
  namespace: '/',
})
export class EventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger = new Logger('EventsGateway');
  private connectedClients = new Map<string, { userId?: string; branchId?: string }>();

  afterInit() {
    this.logger.log('WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    this.connectedClients.set(client.id, {});
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.connectedClients.delete(client.id);
  }

  // Client joins a branch room for scoped events
  @SubscribeMessage('join:branch')
  handleJoinBranch(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { branchId: string; userId?: string },
  ) {
    client.join(`branch:${data.branchId}`);
    this.connectedClients.set(client.id, {
      userId: data.userId,
      branchId: data.branchId,
    });
    this.logger.log(`Client ${client.id} joined branch:${data.branchId}`);
    return { event: 'joined', data: { branchId: data.branchId } };
  }

  // Client joins a KDS station room
  @SubscribeMessage('join:kds')
  handleJoinKds(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { station: string; branchId: string },
  ) {
    client.join(`kds:${data.branchId}:${data.station}`);
    this.logger.log(`Client ${client.id} joined kds:${data.branchId}:${data.station}`);
    return { event: 'joined', data: { station: data.station } };
  }

  // Client leaves rooms
  @SubscribeMessage('leave:branch')
  handleLeaveBranch(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { branchId: string },
  ) {
    client.leave(`branch:${data.branchId}`);
    this.logger.log(`Client ${client.id} left branch:${data.branchId}`);
  }

  // ============================================================
  // EMIT METHODS (called from services)
  // ============================================================

  // Order events
  emitOrderCreated(branchId: string, order: any) {
    this.server.to(`branch:${branchId}`).emit('order:created', order);
  }

  emitOrderStatusChanged(branchId: string, order: any) {
    this.server.to(`branch:${branchId}`).emit('order:status_changed', order);
  }

  emitOrderUpdated(branchId: string, order: any) {
    this.server.to(`branch:${branchId}`).emit('order:updated', order);
  }

  // Table events
  emitTableStatusChanged(branchId: string, table: any) {
    this.server.to(`branch:${branchId}`).emit('table:status_changed', table);
  }

  // KDS events
  emitKdsItemUpdate(branchId: string, station: string, item: any) {
    this.server.to(`kds:${branchId}:${station}`).emit('kds:item_update', item);
    // Also emit to the branch room for general listeners
    this.server.to(`branch:${branchId}`).emit('kds:item_update', item);
  }

  emitKdsNewItems(branchId: string, station: string, items: any[]) {
    this.server.to(`kds:${branchId}:${station}`).emit('kds:new_items', items);
  }

  emitKdsItemBumped(branchId: string, station: string, item: any) {
    this.server.to(`kds:${branchId}:${station}`).emit('kds:item_bumped', item);
    this.server.to(`branch:${branchId}`).emit('kds:item_bumped', item);
  }

  // Order item status change (notifies waiters when items are READY or DELIVERED)
  emitOrderItemStatus(branchId: string, data: {
    orderId: string;
    orderNumber: string;
    itemId: string;
    itemName: string;
    tableNumber?: number;
    tableName?: string;
    status: string;
    quantity?: number;
  }) {
    this.server.to(`branch:${branchId}`).emit('order:item-status', data);
    this.logger.log(`Item status → ${data.status}: ${data.itemName} (Order #${data.orderNumber}, Table ${data.tableName})`);
  }

  // Alert events
  emitNewAlert(branchId: string, alert: any) {
    this.server.to(`branch:${branchId}`).emit('alert:new', alert);
  }

  emitAlertToUser(userId: string, alert: any) {
    // Find the client socket for this user and emit directly
    this.connectedClients.forEach((info, clientId) => {
      if (info.userId === userId) {
        this.server.to(clientId).emit('alert:new', alert);
      }
    });
  }

  // Cash events
  emitCashSessionOpened(branchId: string, session: any) {
    this.server.to(`branch:${branchId}`).emit('cash:session_opened', session);
  }

  emitCashSessionClosed(branchId: string, session: any) {
    this.server.to(`branch:${branchId}`).emit('cash:session_closed', session);
  }

  // Payment events
  emitPaymentReceived(branchId: string, payment: any) {
    this.server.to(`branch:${branchId}`).emit('payment:received', payment);
  }

  // Reservation events
  emitReservationCreated(branchId: string, reservation: any) {
    this.server.to(`branch:${branchId}`).emit('reservation:created', reservation);
  }

  emitReservationUpdated(branchId: string, reservation: any) {
    this.server.to(`branch:${branchId}`).emit('reservation:updated', reservation);
  }

  // Generic broadcast to a branch
  emitToBranch(branchId: string, event: string, data: any) {
    this.server.to(`branch:${branchId}`).emit(event, data);
  }

  // Broadcast to all connected clients
  emitToAll(event: string, data: any) {
    this.server.emit(event, data);
  }

  // Get connection stats
  getConnectionStats() {
    return {
      totalConnections: this.connectedClients.size,
      clients: Array.from(this.connectedClients.entries()).map(([id, info]) => ({
        clientId: id,
        ...info,
      })),
    };
  }
}
