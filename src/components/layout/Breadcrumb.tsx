import { ChevronRight, Home } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { Fragment } from 'react'

interface BreadcrumbItem {
  label: string
  href?: string
}

function parseLocation(pathname: string): BreadcrumbItem[] {
  const paths = pathname.split('/').filter(Boolean)
  const items: BreadcrumbItem[] = []

  const labelMap: Record<string, string> = {
    tenants: 'Tenants',
    users: 'Users',
    new: 'New',
    edit: 'Edit',
    profile: 'Profile',
  }

  let currentPath = ''
  for (const path of paths) {
    currentPath += `/${path}`
    const label = labelMap[path] || path.charAt(0).toUpperCase() + path.slice(1)
    items.push({
      label,
      href: path === 'new' ? undefined : currentPath,
    })
  }

  return items
}

export function Breadcrumb() {
  const location = useLocation()

  if (location.pathname === '/') return null

  const items = parseLocation(location.pathname)

  return (
    <nav className="mb-4">
      <ol className="flex items-center gap-2 text-sm text-muted-foreground">
        <li>
          <Link
            to="/"
            className="flex items-center hover:text-foreground transition-colors"
          >
            <Home className="h-4 w-4" />
          </Link>
        </li>
        {items.map((item, index) => (
          <Fragment key={index}>
            <li>
              <ChevronRight className="h-4 w-4" />
            </li>
            <li>
              {item.href ? (
                <Link
                  to={item.href}
                  className="hover:text-foreground transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="text-foreground font-medium">{item.label}</span>
              )}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  )
}
