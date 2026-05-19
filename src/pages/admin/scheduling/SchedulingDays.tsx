'use client'

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useSchedulingDays, useCreateSchedulingDay, useDeleteSchedulingDay } from '@/api/scheduling'
import type { SchedulingDay } from '@/types/scheduling'

export default function SchedulingDays() {
  const navigate = useNavigate()
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newDate, setNewDate] = useState<string>('')

  const { data: schedulingDays, isLoading } = useSchedulingDays({ limit: 100 })
  const createDay = useCreateSchedulingDay()
  const deleteDay = useDeleteSchedulingDay()

  const days = schedulingDays?.data || []
  const today = new Date().toISOString().split('T')[0]

  const handleCreateDay = async () => {
    if (!newDate) return
    try {
      await createDay.mutateAsync({ date: newDate, is_active: true })
      setShowCreateDialog(false)
      setNewDate('')
    } catch {
      // Error handled by mutation
    }
  }

  const handleDeleteDay = async (id: string) => {
    if (!confirm('Are you sure you want to delete this scheduling day?')) return
    try {
      await deleteDay.mutateAsync(id)
    } catch {
      // Error handled by mutation
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  // Group days by month
  const groupedDays = days.reduce((acc, day) => {
    const date = new Date(day.date)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    if (!acc[key]) {
      acc[key] = []
    }
    acc[key].push(day)
    return acc
  }, {} as Record<string, SchedulingDay[]>)

  const sortedMonths = Object.keys(groupedDays).sort().reverse()

  const activeDays = days.filter((d) => d.is_active).length
  const inactiveDays = days.filter((d) => !d.is_active).length
  const pastDays = days.filter((d) => d.date < today).length

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin')}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Scheduling Days</h1>
            <p className="text-gray-500 mt-1">
              Manage which days are open for scheduling appointments
            </p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Day
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <Calendar className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeDays}</p>
              <p className="text-sm text-gray-500">Active Days</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="p-3 bg-gray-100 rounded-lg">
              <Calendar className="h-6 w-6 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{inactiveDays}</p>
              <p className="text-sm text-gray-500">Inactive Days</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pastDays}</p>
              <p className="text-sm text-gray-500">Past Days</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Days List by Month */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      ) : days.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No scheduling days</h3>
            <p className="text-sm text-gray-500 mt-1">
              Add scheduling days to allow users to book appointments
            </p>
            <Button variant="outline" className="mt-4" onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Day
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {sortedMonths.map((monthKey) => {
            const [year, month] = monthKey.split('-')
            const monthDays = groupedDays[monthKey]
            const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString(
              'en-US',
              { month: 'long', year: 'numeric' }
            )

            return (
              <Card key={monthKey}>
                <CardHeader>
                  <CardTitle>{monthName}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {monthDays.map((day) => {
                      const isPast = day.date < today
                      return (
                        <div
                          key={day.id}
                          className={`flex items-center justify-between p-3 rounded-lg border ${
                            isPast
                              ? 'bg-gray-50 opacity-75'
                              : day.is_active
                              ? 'bg-green-50 border-green-200'
                              : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <div
                              className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                isPast
                                  ? 'bg-gray-200'
                                  : day.is_active
                                  ? 'bg-green-200'
                                  : 'bg-gray-200'
                              }`}
                            >
                              <Calendar
                                className={`h-5 w-5 ${
                                  isPast
                                    ? 'text-gray-400'
                                    : day.is_active
                                    ? 'text-green-600'
                                    : 'text-gray-400'
                                }`}
                              />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{formatDate(day.date)}</span>
                                <Badge
                                  variant={day.is_active ? 'success' : 'secondary'}
                                  className="text-xs"
                                >
                                  {day.is_active ? 'Active' : 'Inactive'}
                                </Badge>
                                {isPast && (
                                  <Badge variant="outline" className="text-xs">
                                    Past
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-gray-500">
                                {day.slots?.length || 0} time slots configured
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteDay(day.id)}
                              disabled={deleteDay.isPending}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Scheduling Day</DialogTitle>
            <DialogDescription>
              Add a new day when appointments can be scheduled
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="date" className="text-sm font-medium">
                Date
              </label>
              <input
                type="date"
                id="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                min={today}
                className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateDay}
              disabled={!newDate || createDay.isPending}
            >
              {createDay.isPending ? 'Creating...' : 'Create Day'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
