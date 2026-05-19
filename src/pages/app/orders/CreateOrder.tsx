import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Check, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { ProductCatalogSections } from '@/components/order/ProductCatalogSections'
import { OrderSummary } from '@/components/order/OrderSummary'
import { VoucherInput } from '@/components/order/VoucherInput'
import { useCreateOrder } from '@/api/orders'
import { useProducts, useProduct } from '@/api/products'
import { calculateDiscount } from '@/api/vouchers'
import { formatCurrency, formatDate } from '@/lib/formatters'
import type { Product } from '@/types/product'
import type { OrderProduct, CreateOrderRequest, Voucher } from '@/types/order'

type WizardStep = 'product' | 'details' | 'review' | 'payment'

const STEPS: { id: WizardStep; label: string }[] = [
  { id: 'product', label: 'Product' },
  { id: 'details', label: 'Details' },
  { id: 'review', label: 'Review' },
  { id: 'payment', label: 'Payment' },
]

export default function CreateOrder() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [currentStep, setCurrentStep] = useState<WizardStep>('product')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [voucher, setVoucher] = useState<Voucher | null>(null)
  const [referralCode, setReferralCode] = useState('')
  const [notes, setNotes] = useState('')

  const productIdParam = searchParams.get('product_id') ?? ''
  const resolvedProductId = productIdParam.trim()

  const { data: productsData, isLoading: productsLoading } = useProducts()
  const { data: singleProduct, isLoading: singleProductLoading } = useProduct(resolvedProductId)
  const createOrder = useCreateOrder()

  const groups = productsData?.groups ?? []

  useEffect(() => {
    if (singleProduct && !selectedProduct) {
      setSelectedProduct(singleProduct)
      setCurrentStep('details')
    }
  }, [singleProduct, selectedProduct])

  const isLoading = productsLoading || (resolvedProductId.length > 0 && singleProductLoading)

  const orderProducts: OrderProduct[] = useMemo(() => {
    if (!selectedProduct) return []
    return [{
      id: `temp-${selectedProduct.id}`,
      order_id: '',
      product_id: selectedProduct.id,
      name: selectedProduct.name,
      description: selectedProduct.description,
      quantity,
      price: selectedProduct.price,
      subtotal: selectedProduct.price * quantity,
      thumbnail: selectedProduct.thumbnail,
    }]
  }, [selectedProduct, quantity])

  const subtotal = selectedProduct ? selectedProduct.price * quantity : 0
  const { discountAmount, finalTotal } = useMemo(
    () => calculateDiscount(subtotal, voucher),
    [subtotal, voucher]
  )

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product)
    setCurrentStep('details')
  }

  const handleApplyVoucher = (v: Voucher, discount: number) => {
    setVoucher(v)
    toast.success('Voucher applied!', {
      description: `You save ${formatCurrency(discount)}`,
    })
  }

  const handleRemoveVoucher = () => {
    setVoucher(null)
    toast.success('Voucher removed')
  }

  const handleCreateOrder = async () => {
    if (!selectedProduct) return

    const orderData: CreateOrderRequest = {
      product_id: selectedProduct.id,
      quantity,
      total: finalTotal,
      voucher_code: voucher?.code || undefined,
      referral_code: referralCode || undefined,
      notes: notes || undefined,
    }

    try {
      const result = await createOrder.mutateAsync(orderData)
      console.log('[VNPay] CreateOrder result:', result)

      if (result.payment_url) {
        console.log('[VNPay] Payment URL:', result.payment_url)
        window.location.href = result.payment_url
        return
      } else if (result.fulfillment_mode === 'package') {
        toast.success('Đã tạo đơn gói luyện thi', {
          description:
            result.order.status === 'paid'
              ? 'Gói đã được kích hoạt, bạn có thể vào luyện thi ngay.'
              : 'Hoàn tất thanh toán để kích hoạt gói luyện thi.',
        })
        navigate(result.order.status === 'paid' ? '/app/packages' : `/app/orders/${result.order_id}`)
      } else {
        toast.success('Order created!', {
          description: result.payment_deadline_at
            ? `Complete payment before ${formatDate(result.payment_deadline_at, 'datetime')}.`
            : 'Redirecting to order details...',
        })
        navigate(`/app/orders/${result.order_id}`)
      }
    } catch (error) {
      toast.error('Failed to create order', {
        description: error instanceof Error ? error.message : 'Please try again',
      })
      setCurrentStep('review')
    }
  }

  const canProceedToDetails = !!selectedProduct
  const canProceedToReview = !!selectedProduct
  const canProceedToPayment = !!selectedProduct

  const renderStepContent = () => {
    switch (currentStep) {
      case 'product':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold">Chọn gói thi</h2>
              <p className="text-sm text-muted-foreground">
                Chọn gói 4 kỹ năng hoặc gói 3 kỹ năng trước khi thanh toán.
              </p>
            </div>

            {isLoading ? (
              <ProductCatalogSections groups={[]} isLoading loadingCount={6} />
            ) : (
              <ProductCatalogSections
                groups={groups}
                selectedProductId={selectedProduct?.id}
                onSelect={handleProductSelect}
                showSelectButton
                loadingCount={6}
              />
            )}
          </div>
        )

      case 'details':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold">Order Details</h2>
              <p className="text-sm text-muted-foreground">
                Provide additional information for your order
              </p>
            </div>

            {selectedProduct && (
              <div className="rounded-lg border bg-card p-4">
                <div className="flex items-center gap-4">
                  {selectedProduct.thumbnail && (
                    <img
                      src={selectedProduct.thumbnail}
                      alt={selectedProduct.name}
                      className="h-16 w-16 rounded-md object-cover"
                    />
                  )}
                  <div>
                    <h3 className="font-medium">{selectedProduct.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(selectedProduct.price)} x {quantity}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {/* Quantity */}
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                  >
                    -
                  </Button>
                  <Input
                    id="quantity"
                    type="number"
                    min={1}
                    max={10}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-20 text-center"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQuantity((q) => Math.min(10, q + 1))}
                    disabled={quantity >= 10}
                  >
                    +
                  </Button>
                </div>
              </div>

              {/* Voucher */}
              <div className="space-y-2">
                <Label>Voucher Code (Optional)</Label>
                <VoucherInput
                  orderSubtotal={subtotal}
                  applicableScope="package"
                  onApply={handleApplyVoucher}
                  onRemove={handleRemoveVoucher}
                  compact
                />
              </div>

              {/* Referral Code */}
              <div className="space-y-2">
                <Label htmlFor="referral">Referral Code (Optional)</Label>
                <Input
                  id="referral"
                  placeholder="Enter referral code"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">
                  <FileText className="inline mr-2 h-4 w-4" />
                  Notes (Optional)
                </Label>
                <Textarea
                  id="notes"
                  placeholder="Any special requests or notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          </div>
        )

      case 'review':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold">Review Your Order</h2>
              <p className="text-sm text-muted-foreground">
                Please review your order details before proceeding to payment
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              {/* Order Details */}
              <div className="lg:col-span-2 space-y-4">
                {/* Products */}
                <div className="rounded-lg border bg-card">
                  <div className="border-b p-4">
                    <h3 className="font-semibold">Products</h3>
                  </div>
                  <div className="p-4 space-y-3">
                    {orderProducts.map((product) => (
                      <div key={product.id} className="flex justify-between">
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {product.quantity} x {formatCurrency(product.price)}
                          </p>
                        </div>
                        <p className="font-medium">
                          {formatCurrency(product.subtotal)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Additional Details */}
                {(voucher || referralCode || notes) && (
                  <div className="rounded-lg border bg-card">
                    <div className="border-b p-4">
                      <h3 className="font-semibold">Additional Details</h3>
                    </div>
                    <div className="p-4 space-y-2 text-sm">
                      {voucher && (
                        <div className="flex justify-between text-green-600">
                          <span className="text-muted-foreground">Voucher</span>
                          <span>{voucher.code}</span>
                        </div>
                      )}
                      {referralCode && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Referral Code</span>
                          <span>{referralCode}</span>
                        </div>
                      )}
                      {notes && (
                        <div className="flex flex-col gap-1">
                          <span className="text-muted-foreground">Notes</span>
                          <span className="mt-1 rounded bg-muted p-2">{notes}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Order Summary */}
              <div>
                <OrderSummary
                  products={orderProducts}
                  subtotal={subtotal}
                  discount={discountAmount}
                  voucher={voucher}
                  total={finalTotal}
                  onApplyVoucher={() => setCurrentStep('details')}
                  onRemoveVoucher={voucher ? handleRemoveVoucher : undefined}
                />
              </div>
            </div>
          </div>
        )

      case 'payment':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold">Payment</h2>
              <p className="text-sm text-muted-foreground">
                Complete your payment to finalize the order
              </p>
            </div>

            <div className="rounded-lg border bg-card p-6">
              <div className="space-y-4">
                <div className="flex justify-between text-lg">
                  <span>Total Amount</span>
                  <span className="font-bold text-primary">
                    {formatCurrency(finalTotal)}
                  </span>
                </div>

                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="text-sm text-muted-foreground">
                    You will be redirected to VNPay secure payment page to complete your transaction.
                  </p>
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleCreateOrder}
                  disabled={createOrder.isPending}
                >
                  {createOrder.isPending ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Processing...
                    </>
                  ) : (
                    <>
                      <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
                      </svg>
                      Pay with VNPay
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setCurrentStep('review')}
                >
                  Back to Review
                </Button>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep)

  return (
    <div className="container mx-auto py-8">
      <div className="mx-auto max-w-4xl">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => {
              const isComplete = index < currentStepIndex
              const isCurrent = index === currentStepIndex

              return (
                <div key={step.id} className="flex items-center">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full border-2 font-semibold transition-colors ${
                      isComplete
                        ? 'border-primary bg-primary text-primary-foreground'
                        : isCurrent
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-muted-foreground/30 text-muted-foreground'
                    }`}
                  >
                    {isComplete ? <Check className="h-5 w-5" /> : index + 1}
                  </div>
                  <span
                    className={`ml-2 text-sm font-medium hidden sm:inline ${
                      isCurrent ? 'text-primary' : 'text-muted-foreground'
                    }`}
                  >
                    {step.label}
                  </span>
                  {index < STEPS.length - 1 && (
                    <div
                      className={`mx-4 h-0.5 w-12 flex-1 sm:mx-2 ${
                        isComplete ? 'bg-primary' : 'bg-muted-foreground/30'
                      }`}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="rounded-lg border bg-card p-6">
          {renderStepContent()}
        </div>

        {/* Navigation */}
        <div className="mt-6 flex justify-between">
          <Button
            variant="outline"
            onClick={() => {
              if (currentStepIndex > 0) {
                setCurrentStep(STEPS[currentStepIndex - 1].id)
              } else {
                navigate('/app/products')
              }
            }}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            {currentStepIndex === 0 ? 'Cancel' : 'Back'}
          </Button>

          {currentStep !== 'payment' && (
            <Button
              onClick={() => {
                switch (currentStep) {
                  case 'product':
                    if (canProceedToDetails) setCurrentStep('details')
                    break
                  case 'details':
                    if (canProceedToReview) setCurrentStep('review')
                    break
                  case 'review':
                    if (canProceedToPayment) setCurrentStep('payment')
                    break
                }
              }}
              disabled={
                (currentStep === 'product' && !canProceedToDetails) ||
                (currentStep === 'details' && !canProceedToReview) ||
                (currentStep === 'review' && !canProceedToPayment)
              }
            >
              Next
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
