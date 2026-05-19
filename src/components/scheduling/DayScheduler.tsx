'use client'

import { useState } from 'react'
import { Plus, Trash2, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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

interface DaySchedulerProps {
  onDayCreated?: () => void
}

export const DayScheduler = ({ onDayCreated }: DaySchedulerProps) => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newDate, setNewDate] = useState<string>('')
  const [selectedMonth, setSelectedMonth] = useState(new Date())

  const { data: schedulingDays, isLoading } = useSchedulingDays({ limit: 100 })
  const createDay = useCreateSchedulingDay()
  const deleteDay = useDeleteSchedulingDay()

  const handleCreateDay = async () => {
    if (!newDate) return

    try {
      await createDay.mutateAsync({ date: newDate, is_active: true })
      setIsCreateDialogOpen(false)
      setNewDate('')
      onDayCreated?.()
    } catch {
      // Error handled by mutation
    }
  }

  const handleDeleteDay = async (id: string) => {
    if (!confirm('Are you sure you want to delete this scheduling day?')) return
    try {
      await deleteDay.mutateAsync(id)
      onDayCreated?.()
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

  const today = new Date().toISOString().split('T')[0]

  const filterByMonth = (days: SchedulingDay[]) => {
    return days.filter((d) => {
      const date = new Date(d.date)
      return (
        date.getMonth() === selectedMonth.getMonth() &&
        date.getFullYear() === selectedMonth.getFullYear()
      )
    })
  }

  const days = schedulingDays?.data || []
  const filteredDays = filterByMonth(days)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Scheduling Days</h2>
          <p className="text-sm text-gray-500">
            Manage which days are available for scheduling
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Day
        </Button>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const newMonth = new Date(selectedMonth)
            newMonth.setMonth(newMonth.getMonth() - 1)
            setSelectedMonth(newMonth)
          }}
        >
          Previous
        </Button>
        <span className="text-lg font-medium">
          {selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const newMonth = new Date(selectedMonth)
            newMonth.setMonth(newMonth.getMonth() + 1)
            setSelectedMonth(newMonth)
          }}
        >
          Next
        </Button>
      </div>

      {/* Days List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : filteredDays.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No scheduling days</h3>
            <p className="text-sm text-gray-500 mt-1">
              Add scheduling days to make appointments available
            </p>
            <Button variant="outline" className="mt-4" onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Day
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredDays.map((day) => (
            <Card key={day.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      day.is_active ? 'bg-green-100' : 'bg-gray-100'
                    }`}
                  >
                    <Calendar
                      className={`h-6 w-6 ${day.is_active ? 'text-green-600' : 'text-gray-400'}`}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900">{formatDate(day.date)}</h3>
                      <Badge variant={day.is_active ? 'success' : 'secondary'}>
                        {day.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      {day.date < today && (
                        <Badge variant="outline">Past</Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      {day.slots?.length || 0} time slots configured
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteDay(day.id)}
                    disabled={deleteDay.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Summary */}
      <div className="flex items-center gap-6 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-green-100 border border-green-200"></div>
          <span>{days.filter((d) => d.is_active).length} active days</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-gray-100 border border-gray-200"></div>
          <span>{days.filter((d) => !d.is_active).length} inactive days</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-gray-50 border border-gray-200"></div>
          <span>{days.filter((d) => d.date < today).length} past days</span>
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Scheduling Day</DialogTitle>
            <DialogDescription>
              Add a new day for scheduling appointments
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newDate">Date</Label>
              <Input
                type="date"
                id="newDate"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                min={today}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
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
