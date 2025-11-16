import type { Order, DeliveryUser } from "./types"

export const mockOrders: Order[] = [
  {
    id: "ORD001",
    customerName: "Nguyễn Văn A",
    address: "123 Đường ABC, Quận 1, TP.HCM",
    phone: "0901234567",
    products: [
      { id: "1", name: "Bánh mì thịt nướng", quantity: 2, price: 25000 },
      { id: "2", name: "Cà phê sữa đá", quantity: 1, price: 20000 },
    ],
    status: "pending",
    createdAt: "2024-01-15T08:30:00Z",
    notes: "Giao tận tay, không gọi chuông",
    totalAmount: 70000,
  },
  {
    id: "ORD002",
    customerName: "Trần Thị B",
    address: "456 Đường XYZ, Quận 3, TP.HCM",
    phone: "0907654321",
    products: [
      { id: "3", name: "Cơm gà", quantity: 1, price: 45000 },
      { id: "4", name: "Nước ngọt", quantity: 2, price: 15000 },
    ],
    status: "delivering",
    createdAt: "2024-01-15T09:15:00Z",
    totalAmount: 75000,
  },
  {
    id: "ORD003",
    customerName: "Lê Văn C",
    address: "789 Đường DEF, Quận 7, TP.HCM",
    phone: "0903456789",
    products: [{ id: "5", name: "Pizza hải sản", quantity: 1, price: 120000 }],
    status: "completed",
    createdAt: "2024-01-15T07:45:00Z",
    totalAmount: 120000,
  },
  {
    id: "ORD004",
    customerName: "Phạm Thị D",
    address: "321 Đường GHI, Quận 5, TP.HCM",
    phone: "0905678901",
    products: [
      { id: "6", name: "Phở bò", quantity: 2, price: 50000 },
      { id: "7", name: "Trà đá", quantity: 2, price: 5000 },
    ],
    status: "pending",
    createdAt: "2024-01-15T10:00:00Z",
    notes: "Gọi trước khi đến",
    totalAmount: 110000,
  },
  {
    id: "ORD005",
    customerName: "Hoàng Văn E",
    address: "654 Đường JKL, Quận 2, TP.HCM",
    phone: "0908765432",
    products: [{ id: "8", name: "Bún bò Huế", quantity: 1, price: 40000 }],
    status: "cancelled",
    createdAt: "2024-01-15T06:30:00Z",
    totalAmount: 40000,
  },
]

export const mockUser: DeliveryUser = {
  id: "USER001",
  name: "Nguyễn Văn Shipper",
  phone: "0909123456",
  avatar: "https://via.placeholder.com/100",
  joinDate: "2023-06-15",
  totalDeliveries: 1247,
  email: "shipper@example.com",
}
