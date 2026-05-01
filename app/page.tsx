"use client"

import { useState } from "react"
import { Home, Package, User, MapPin, Phone, Clock, CheckCircle, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Types
interface Order {
  id: string
  customerName: string
  address: string
  phone: string
  products: Product[]
  status: "pending" | "delivering" | "completed" | "cancelled"
  createdAt: string
  notes?: string
  totalAmount: number
}

interface Product {
  id: string
  name: string
  quantity: number
  price: number
}

interface DeliveryUser {
  id: string
  name: string
  phone: string
  avatar?: string
  joinDate: string
  totalDeliveries: number
}

// Mock data
const mockOrders: Order[] = [
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
]

const mockUser: DeliveryUser = {
  id: "USER001",
  name: "Nguyễn Văn Shipper",
  phone: "0909123456",
  avatar: "/placeholder.svg?height=100&width=100",
  joinDate: "2023-06-15",
  totalDeliveries: 1247,
}

// Components
function OrderCard({ order, onViewDetail }: { order: Order; onViewDetail: (order: Order) => void }) {
  const getStatusColor = (status: Order["status"]) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "delivering":
        return "bg-blue-100 text-blue-800"
      case "completed":
        return "bg-green-100 text-green-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusText = (status: Order["status"]) => {
    switch (status) {
      case "pending":
        return "Chờ giao"
      case "delivering":
        return "Đang giao"
      case "completed":
        return "Hoàn thành"
      case "cancelled":
        return "Đã hủy"
      default:
        return "Không xác định"
    }
  }

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="font-semibold text-lg">{order.customerName}</h3>
            <p className="text-sm text-gray-600">#{order.id}</p>
          </div>
          <Badge className={getStatusColor(order.status)}>{getStatusText(order.status)}</Badge>
        </div>

        <div className="space-y-2 mb-3">
          <div className="flex items-center text-sm text-gray-600">
            <MapPin className="w-4 h-4 mr-2" />
            <span className="flex-1">{order.address}</span>
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <Phone className="w-4 h-4 mr-2" />
            <span>{order.phone}</span>
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <Clock className="w-4 h-4 mr-2" />
            <span>{new Date(order.createdAt).toLocaleString("vi-VN")}</span>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <span className="font-semibold text-lg text-green-600">{order.totalAmount.toLocaleString("vi-VN")}đ</span>
          <Button onClick={() => onViewDetail(order)} size="sm">
            Chi tiết
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function OrderDetail({
  order,
  onBack,
  onUpdateStatus,
}: {
  order: Order
  onBack: () => void
  onUpdateStatus: (orderId: string, status: Order["status"]) => void
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onBack}>
          ← Quay lại
        </Button>
        <h1 className="text-xl font-bold">Chi tiết đơn hàng</h1>
        <div></div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Thông tin khách hàng</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-600">Tên khách hàng</label>
            <p className="text-lg">{order.customerName}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Địa chỉ giao hàng</label>
            <p className="text-lg">{order.address}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Số điện thoại</label>
            <p className="text-lg">{order.phone}</p>
          </div>
          {order.notes && (
            <div>
              <label className="text-sm font-medium text-gray-600">Ghi chú</label>
              <p className="text-lg">{order.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sản phẩm</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {order.products.map((product) => (
              <div key={product.id} className="flex justify-between items-center py-2 border-b last:border-b-0">
                <div>
                  <p className="font-medium">{product.name}</p>
                  <p className="text-sm text-gray-600">Số lượng: {product.quantity}</p>
                </div>
                <p className="font-semibold">{(product.price * product.quantity).toLocaleString("vi-VN")}đ</p>
              </div>
            ))}
            <div className="flex justify-between items-center pt-3 border-t font-bold text-lg">
              <span>Tổng cộng:</span>
              <span className="text-green-600">{order.totalAmount.toLocaleString("vi-VN")}đ</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {order.status !== "completed" && order.status !== "cancelled" && (
        <Card>
          <CardHeader>
            <CardTitle>Cập nhật trạng thái</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {order.status === "pending" && (
              <Button onClick={() => onUpdateStatus(order.id, "delivering")} className="w-full">
                <Package className="w-4 h-4 mr-2" />
                Bắt đầu giao hàng
              </Button>
            )}
            {order.status === "delivering" && (
              <div className="space-y-2">
                <Button
                  onClick={() => onUpdateStatus(order.id, "completed")}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Đã giao thành công
                </Button>
                <Button onClick={() => onUpdateStatus(order.id, "cancelled")} variant="destructive" className="w-full">
                  <XCircle className="w-4 h-4 mr-2" />
                  Hủy đơn hàng
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default function VivieneDeliveryApp() {
  const [orders, setOrders] = useState<Order[]>(mockOrders)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [activeTab, setActiveTab] = useState("home")

  const handleViewDetail = (order: Order) => {
    setSelectedOrder(order)
  }

  const handleBack = () => {
    setSelectedOrder(null)
  }

  const handleUpdateStatus = (orderId: string, status: Order["status"]) => {
    setOrders((prev) => prev.map((order) => (order.id === orderId ? { ...order, status } : order)))
    setSelectedOrder((prev) => (prev ? { ...prev, status } : null))
  }

  const pendingOrders = orders.filter((order) => order.status === "pending")
  const deliveringOrders = orders.filter((order) => order.status === "delivering")
  const completedToday = orders.filter(
    (order) => order.status === "completed" && new Date(order.createdAt).toDateString() === new Date().toDateString(),
  )

  if (selectedOrder) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-md mx-auto">
          <OrderDetail order={selectedOrder} onBack={handleBack} onUpdateStatus={handleUpdateStatus} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="bg-white border-b">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="home" className="flex items-center gap-2">
                <Home className="w-4 h-4" />
                Trang chủ
              </TabsTrigger>
              <TabsTrigger value="orders" className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                Đơn hàng
              </TabsTrigger>
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Hồ sơ
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="home" className="p-4 space-y-4">
            <div className="text-center py-4">
              <h1 className="text-2xl font-bold text-gray-800">Xin chào, {mockUser.name}!</h1>
              <p className="text-gray-600">
                Hôm nay bạn có {pendingOrders.length + deliveringOrders.length} đơn cần giao
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{pendingOrders.length}</div>
                  <div className="text-sm text-gray-600">Chờ giao</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{completedToday.length}</div>
                  <div className="text-sm text-gray-600">Hoàn thành hôm nay</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Đơn hàng gần nhất</CardTitle>
              </CardHeader>
              <CardContent>
                {orders.slice(0, 3).map((order) => (
                  <OrderCard key={order.id} order={order} onViewDetail={handleViewDetail} />
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders" className="p-4">
            <div className="space-y-4">
              <h1 className="text-xl font-bold">Danh sách đơn hàng</h1>

              <Tabs defaultValue="all" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="all">Tất cả</TabsTrigger>
                  <TabsTrigger value="pending">Chờ giao</TabsTrigger>
                  <TabsTrigger value="delivering">Đang giao</TabsTrigger>
                  <TabsTrigger value="completed">Hoàn thành</TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="mt-4">
                  {orders.map((order) => (
                    <OrderCard key={order.id} order={order} onViewDetail={handleViewDetail} />
                  ))}
                </TabsContent>

                <TabsContent value="pending" className="mt-4">
                  {pendingOrders.map((order) => (
                    <OrderCard key={order.id} order={order} onViewDetail={handleViewDetail} />
                  ))}
                </TabsContent>

                <TabsContent value="delivering" className="mt-4">
                  {deliveringOrders.map((order) => (
                    <OrderCard key={order.id} order={order} onViewDetail={handleViewDetail} />
                  ))}
                </TabsContent>

                <TabsContent value="completed" className="mt-4">
                  {orders
                    .filter((order) => order.status === "completed")
                    .map((order) => (
                      <OrderCard key={order.id} order={order} onViewDetail={handleViewDetail} />
                    ))}
                </TabsContent>
              </Tabs>
            </div>
          </TabsContent>

          <TabsContent value="profile" className="p-4">
            <div className="space-y-6">
              <Card>
                <CardContent className="p-6 text-center">
                  <Avatar className="w-20 h-20 mx-auto mb-4">
                    <AvatarImage src={mockUser.avatar || "/placeholder.svg"} alt={mockUser.name} />
                    <AvatarFallback>{mockUser.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <h2 className="text-xl font-bold">{mockUser.name}</h2>
                  <p className="text-gray-600">{mockUser.phone}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Thống kê</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Ngày tham gia:</span>
                    <span className="font-medium">{new Date(mockUser.joinDate).toLocaleDateString("vi-VN")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tổng đơn đã giao:</span>
                    <span className="font-medium">{mockUser.totalDeliveries.toLocaleString("vi-VN")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Đơn hoàn thành hôm nay:</span>
                    <span className="font-medium">{completedToday.length}</span>
                  </div>
                </CardContent>
              </Card>

              <Button variant="destructive" className="w-full">
                Đăng xuất
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
