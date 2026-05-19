import { Link } from 'react-router-dom'
import { BookOpen, ShoppingCart, Calendar, User, Package } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface QuickAction {
  title: string
  description: string
  href: string
  icon: React.ElementType
  color: string
}

const quickActions: QuickAction[] = [
  {
    title: 'Gói luyện tập',
    description: 'Mua gói 3 hoặc 4 kỹ năng',
    href: '/app/products',
    icon: Package,
    color: 'bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300',
  },
  {
    title: 'Practice Exams',
    description: 'Start available practice tests',
    href: '/app/exams',
    icon: BookOpen,
    color: 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300',
  },
  {
    title: 'My Orders',
    description: 'View your purchase history',
    href: '/app/orders',
    icon: ShoppingCart,
    color: 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300',
  },
  {
    title: 'Appointments',
    description: 'Schedule consultation sessions',
    href: '/app/appointments',
    icon: Calendar,
    color: 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300',
  },
  {
    title: 'Profile',
    description: 'Manage your account settings',
    href: '/app/profile',
    icon: User,
    color: 'bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-300',
  },
]

export function QuickActions() {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
      {quickActions.map((action) => {
        const Icon = action.icon
        return (
          <Link key={action.href} to={action.href}>
            <Card className="hover:shadow-md hover:border-primary/50 transition-all cursor-pointer group">
              <CardContent className="p-4 flex flex-col items-center text-center gap-3">
                <div className={cn('rounded-full p-3 transition-transform group-hover:scale-110', action.color)}>
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-medium text-sm">{action.title}</h3>
                  <p className="text-xs text-muted-foreground">{action.description}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}
