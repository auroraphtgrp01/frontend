import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'

// ============ Auth Pages ============
import LoginPage from '@/pages/auth/Login'
import SuperAdminLoginPage from '@/pages/auth/SuperAdminLogin'
import TwoFactorVerifyPage from '@/pages/auth/TwoFactorVerify'
import TwoFactorSetupPage from '@/pages/auth/TwoFactorSetup'

// ============ App (Tenant User) Pages ============
import AppDashboardPage from '@/pages/app/AppDashboard'
import AppProfilePage from '@/pages/app/AppProfile'
import ExamResultsPage from '@/pages/app/results/ExamResults'
import ResultDetailPage from '@/pages/app/results/ResultDetail'
import ExamListPage from '@/pages/app/exams/ExamList'
import ExamDetailPage from '@/pages/app/exams/ExamDetail'
import ExamSessionPage from '@/pages/app/exams/ExamSessionPage'
import DebugExamSessionPage from '@/pages/app/exams/DebugExamSession'
import TrialExamPage from '@/pages/app/trial/TrialExamPage'
import TrialExamSessionPage from '@/pages/app/trial/TrialExamSessionPage'

// ============ App Orders & Booking Pages ============
import ProductListPage from '@/pages/app/orders/ProductList'
import CreateOrderPage from '@/pages/app/orders/CreateOrder'
import OrderListPage from '@/pages/app/orders/OrderList'
import OrderDetailPage from '@/pages/app/orders/OrderDetail'
import PaymentCallbackPage from '@/pages/app/orders/PaymentCallback'
import PackageHubPage from '@/pages/app/orders/PackageHub'
import RetailRegistrationPage from '@/pages/app/orders/RetailRegistration'
import BookingWizardPage from '@/pages/app/bookings/BookingWizard'

// ============ App Appointments Pages ============
import MyAppointmentsPage from '@/pages/app/appointments/MyAppointments'
import AppointmentDetailPage from '@/pages/app/appointments/AppointmentDetail'

// ============ Admin Pages ============
import DashboardPage from '@/pages/admin/Dashboard'
import TenantListPage from '@/pages/admin/tenants/TenantList'
import TenantFormPage from '@/pages/admin/tenants/TenantForm'
import TenantDetailPage from '@/pages/admin/tenants/TenantDetail'
import UserListPage from '@/pages/admin/users/UserList'
import UserFormPage from '@/pages/admin/users/UserForm'
import UserDetailPage from '@/pages/admin/users/UserDetail'

// ============ Admin Orders & Scheduling Pages ============
import AllOrdersPage from '@/pages/admin/orders/AllOrders'
import OrderManagementPage from '@/pages/admin/orders/OrderManagement'
import SchedulingDaysPage from '@/pages/admin/scheduling/SchedulingDays'
import TimeSlotManagementPage from '@/pages/admin/scheduling/TimeSlotManagement'

// ============ Analytics Pages ============
import CrossAcademyAnalyticsPage from '@/pages/admin/analytics/CrossAcademyAnalytics'
import RevenueAnalyticsPage from '@/pages/admin/analytics/RevenueAnalytics'

// ============ Grading Pages ============
import GradingQueuePage from '@/pages/admin/grading/GradingQueue'
import GradingReviewPage from '@/pages/admin/grading/GradingReview'
import TrialGradingQueuePage from '@/pages/admin/grading/TrialGradingQueuePage'

// ============ Components ============
import {
  ProtectedRoute,
  GuestRoute,
  AdminRoute,
  AcademyAdminRoute,
  SuperAdminRoute,
  TeacherRoute,
} from '@/components/layout/ProtectedRoute'
import { useAuth } from '@/contexts/AuthContext'
import { ROLES, ROUTES } from '@/lib/constants'
import { defaultPathAfterTenantAuth } from '@/lib/post-auth-redirect'
import { getAppFlow, shellVariantForFlow } from '@/lib/app-flow'
import { Skeleton } from '@/components/ui/skeleton'
import PlatformProfilePage from '@/pages/admin/PlatformProfilePage'
import StaffProfilePage from '@/pages/admin/StaffProfilePage'
import ExamBankListPage from '@/pages/admin/exams/ExamBankList'
import ExamBankDetailPage from '@/pages/admin/exams/ExamBankDetail'
import ExamMigrationJobsPage from '@/pages/admin/exams/ExamMigrationJobs'

// ============================================================
// Root / unknown paths → login or role home (never bare "/")
// ============================================================

function HomeRedirect() {
  const { isAuthenticated, isLoading, isSuperAdmin, user } = useAuth()

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />
  }

  return (
    <Navigate
      to={
        isSuperAdmin()
          ? '/admin'
          : defaultPathAfterTenantAuth(user?.role)
      }
      replace
    />
  )
}

// ============================================================
// App Routes (Tenant User) Shell
// ============================================================

function AppLayout() {
  return (
    <AppShell variant="learner">
      <Outlet />
    </AppShell>
  )
}

// ============================================================
// Admin Routes Shell
// ============================================================

function AdminLayout() {
  const { user } = useAuth()
  const variant = shellVariantForFlow(getAppFlow(user?.role))
  return (
    <AppShell variant={variant}>
      <Outlet />
    </AppShell>
  )
}

// ============================================================
// Route Definitions
// ============================================================

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />

      {/* ---- Public Routes ---- */}
      <Route
        path="/login"
        element={
          <GuestRoute>
            <LoginPage />
          </GuestRoute>
        }
      />
      <Route
        path="/admin/login"
        element={
          <GuestRoute>
            <SuperAdminLoginPage />
          </GuestRoute>
        }
      />

      {/* ---- Auth Routes (authenticated) ---- */}
      <Route
        path="/auth/2fa/verify"
        element={<TwoFactorVerifyPage />}
      />
      <Route
        path="/auth/2fa/setup"
        element={
          <ProtectedRoute
            allowedRoles={[
              ROLES.SYSTEM_ADMIN,
              ROLES.ACADEMY_ADMIN,
              ROLES.TEACHER,
              ROLES.USER,
            ]}
          >
            <TwoFactorSetupPage />
          </ProtectedRoute>
        }
      />

      {/* ================================================ */}
      {/* APP ROUTES (Tenant Users) */}
      {/* ================================================ */}

      <Route
        path="/app"
        element={
          <ProtectedRoute
            allowedRoles={[
              ROLES.USER,
              ROLES.TEACHER,
              ROLES.ACADEMY_ADMIN,
              ROLES.SYSTEM_ADMIN,
            ]}
          >
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/app/dashboard" replace />} />
        <Route path="dashboard" element={<AppDashboardPage />} />
        <Route path="profile" element={<AppProfilePage />} />

        {/* Results */}
        <Route path="results" element={<ExamResultsPage />} />
        <Route path="results/:id" element={<ExamResultsPage />} />
        <Route path="results/:id/detail" element={<ResultDetailPage />} />
        <Route path="practice/results/:id" element={<ExamResultsPage />} />
        <Route path="practice/results/:id/detail" element={<ResultDetailPage />} />
        <Route path="practice/session/:attemptId" element={<ExamSessionPage />} />

        {/* Exams */}
        <Route path="exams" element={<ExamListPage />} />
        <Route path="exams/debug" element={<DebugExamSessionPage />} />
        <Route path="exams/:examId/detail" element={<ExamDetailPage />} />
        <Route path="exams/session/:attemptId" element={<ExamSessionPage />} />

        {/* Orders & Booking */}
        <Route path="products" element={<ProductListPage />} />
        <Route path="register" element={<RetailRegistrationPage />} />
        <Route path="orders" element={<OrderListPage />} />
        <Route path="orders/new" element={<CreateOrderPage />} />
        <Route path="orders/new/:mode" element={<BookingWizardPage />} />
        <Route path="orders/:id" element={<OrderDetailPage />} />
        <Route path="orders/payment-callback" element={<PaymentCallbackPage />} />
        <Route path="packages" element={<PackageHubPage />} />

        {/* Appointments */}
        <Route path="appointments" element={<MyAppointmentsPage />} />
        <Route path="appointments/:id" element={<AppointmentDetailPage />} />

        {/* Trial Exam */}
        <Route path="trial" element={<TrialExamPage />} />
        <Route path="trial/exam/:sessionId" element={<TrialExamSessionPage />} />
      </Route>

      {/* ================================================ */}
      {/* ADMIN ROUTES (system_admin / academy_admin) */}
      {/* ================================================ */}

      {/* Admin Dashboard */}
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminLayout />
          </AdminRoute>
        }
      >
        <Route index element={<DashboardPage />} />
      </Route>
      <Route
        path="/admin/dashboard"
        element={<Navigate to="/admin" replace />}
      />

      {/* Tenant Management (system_admin only) */}
      <Route
        path="/admin/tenants"
        element={
          <SuperAdminRoute>
            <AdminLayout />
          </SuperAdminRoute>
        }
      >
        <Route index element={<TenantListPage />} />
        <Route path="new" element={<TenantFormPage />} />
        <Route path=":id/edit" element={<TenantFormPage />} />
        <Route path=":id" element={<TenantDetailPage />} />
      </Route>

      {/* Exam bank — registry list/detail (system_admin; GET /api/v1/exams) */}
      <Route
        path="/admin/exams"
        element={
          <SuperAdminRoute>
            <AdminLayout />
          </SuperAdminRoute>
        }
      >
        <Route index element={<ExamBankListPage />} />
        <Route path=":id" element={<ExamBankDetailPage />} />
      </Route>

      {/* Exam migration jobs (system_admin; /api/v1/admin/exam-migrations/jobs) */}
      <Route
        path="/admin/exam-migrations"
        element={
          <SuperAdminRoute>
            <AdminLayout />
          </SuperAdminRoute>
        }
      >
        <Route index element={<ExamMigrationJobsPage />} />
        <Route path=":jobId" element={<ExamMigrationJobsPage />} />
      </Route>

      {/* User Management (Admin/School-Admin) */}
      <Route
        path="/admin/users"
        element={
          <AdminRoute>
            <AdminLayout />
          </AdminRoute>
        }
      >
        <Route index element={<UserListPage />} />
        <Route path="new" element={<UserFormPage />} />
        <Route path=":id/edit" element={<UserFormPage />} />
        <Route path=":id" element={<UserDetailPage />} />
      </Route>

      {/* Analytics (Admin only) */}
      <Route
        path="/admin/analytics"
        element={
          <AdminRoute>
            <AdminLayout />
          </AdminRoute>
        }
      >
        <Route index element={<CrossAcademyAnalyticsPage />} />
        <Route path="revenue" element={<RevenueAnalyticsPage />} />
      </Route>

      {/* Orders (academy_admin only — system_admin uses analytics, not order ops) */}
      <Route
        path="/admin/orders"
        element={
          <AcademyAdminRoute>
            <AdminLayout />
          </AcademyAdminRoute>
        }
      >
        <Route index element={<AllOrdersPage />} />
        <Route path=":id" element={<OrderManagementPage />} />
      </Route>

      {/* Scheduling (academy_admin only) */}
      <Route
        path="/admin/scheduling"
        element={
          <AcademyAdminRoute>
            <AdminLayout />
          </AcademyAdminRoute>
        }
      >
        <Route path="days" element={<SchedulingDaysPage />} />
        <Route path="timeslots" element={<TimeSlotManagementPage />} />
      </Route>

      {/* Grading (Teacher/Admin) */}
      <Route
        path="/admin/grading"
        element={
          <TeacherRoute>
            <AdminLayout />
          </TeacherRoute>
        }
      >
        <Route index element={<GradingQueuePage />} />
        <Route path=":id" element={<GradingReviewPage />} />
      </Route>

      {/* Trial Grading (Teacher/Admin) */}
      <Route
        path="/admin/grading/trial"
        element={
          <TeacherRoute>
            <AdminLayout />
          </TeacherRoute>
        }
      >
        <Route index element={<TrialGradingQueuePage />} />
        <Route path=":queueId" element={<TrialGradingQueuePage />} />
      </Route>

      {/* Super Admin — global profile (GET /api/v1/global/users/me) */}
      <Route
        path="/admin/platform-profile"
        element={
          <SuperAdminRoute>
            <AdminLayout />
          </SuperAdminRoute>
        }
      >
        <Route index element={<PlatformProfilePage />} />
      </Route>

      {/* Academy staff — tenant profile (GET /api/v1/users/me) */}
      <Route
        path="/admin/staff-profile"
        element={
          <ProtectedRoute
            allowedRoles={[ROLES.ACADEMY_ADMIN, ROLES.TEACHER]}
          >
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<StaffProfilePage />} />
      </Route>

      {/* ---- Catch-all ---- */}
      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  )
}

// ============================================================
// Root Component
// ============================================================

function App() {
  return <AppRoutes />
}

export default App
