import { prisma } from "./prisma";

export async function assertTableInRestaurant(
  restaurantId: string,
  tableId: string
) {
  const table = await prisma.table.findFirst({
    where: { id: tableId, restaurantId, isActive: true },
  });
  if (!table) {
    throw new Error("Table not found");
  }
  return table;
}

export async function assertCustomerInRestaurant(
  restaurantId: string,
  customerId: string
) {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, restaurantId },
  });
  if (!customer) {
    throw new Error("Customer not found");
  }
  return customer;
}
