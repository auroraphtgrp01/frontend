'use client'

import { useState } from 'react'
import { Plus, Calendar, Trash2, Edit } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { CalendarView } from '@/components/scheduling/CalendarView'
import { BatchTimeSlotForm } from '@/components/scheduling/BatchTimeSlotForm'
import { useTimeSlots, useCreateBatchTimeSlots, useUpdateTimeSlot, useDeleteTimeSlot } from '@/api/timeslots'
import { useSchedulingDays } from '@/api/scheduling'
import { formatTimeSlotRange } from '@/lib/time-slot'
import type { TimeSlot } from '@/types/scheduling'

export default function TimeSlotManagement() {
  const [selectedDate, setSelectedDate] = useState<string | undefined>()
  const [showCreateBatch, setShowCreateBatch] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingSlot, setEditingSlot] = useState<TimeSlot | null>(null)
  const [editCapacity, setEditCapacity] = useState<number>(0)
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const { data: slotsData, isLoading: isLoadingSlots } = useTimeSlots({
    date: selectedDate,
    limit: 100,
  })
  const { data: schedulingDaysData } = useSchedulingDays({ limit: 100 })

  const createBatchSlots = useCreateBatchTimeSlots()
  const updateSlot = useUpdateTimeSlot()
  const deleteSlot = useDeleteTimeSlot()

  const slots = slotsData?.data || []
  const schedulingDays = schedulingDaysData?.data || []

  const handleDayClick = (date: string) => {
    setSelectedDate(date)
  }

  const handleCreateBatch = async (data: any[]) => {
    try {
      await createBatchSlots.mutateAsync(data)
      setShowCreateBatch(false)
    } catch {
      // Error handled by mutation
    }
  }

  const handleEditSlot = (slot: TimeSlot) => {
    setEditingSlot(slot)
    setEditCapacity(slot.capacity ?? 0)
    setShowEditDialog(true)
  }

  const handleUpdateSlot = async () => {
    if (!editingSlot) return
    try {
      await updateSlot.mutateAsync({
        id: editingSlot.id,
        data: { capacity: editCapacity },
      })
      setShowEditDialog(false)
      setEditingSlot(null)
    } catch {
      // Error handled by mutation
    }
  }

  const handleDeleteSlot = async (id: string) => {
    if (!confirm('Are you sure you want to delete this time slot?')) return
    try {
      await deleteSlot.mutateAsync(id)
    } catch {
      // Error handled by mutation
    }
  }

  const formatSlotTime = (slot: TimeSlot) =>
    formatTimeSlotRange(slot.time_slot, slot.start_time, slot.end_time)

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Time Slot Management</h1>
        <p className="text-gray-500 mt-1">
          Create and manage available time slots for appointments
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-1">
          <CalendarView
            days={schedulingDays}
            currentMonth={currentMonth}
            onMonthChange={setCurrentMonth}
            onDayClick={handleDayClick}
            selectedDate={selectedDate}
          />
        </div>

        {/* Time Slots */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>
                {selectedDate
                  ? `Time Slots for ${selectedDate}`
                  : 'Select a date to view slots'}
              </CardTitle>
              <Button onClick={() => setShowCreateBatch(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Batch
              </Button>
            </CardHeader>
            <CardContent>
              {isLoadingSlots ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : slots.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900">No time slots</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {selectedDate
                      ? 'No slots configured for this date'
                      : 'Select a date from the calendar to view slots'}
                  </p>
                  {selectedDate && (
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => setShowCreateBatch(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Slots for {selectedDate}
                    </Button>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Capacity</TableHead>
                      <TableHead>Booked</TableHead>
                      <TableHead>Available</TableHead>
                      <TableHead>Teacher</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {slots.map((slot) => (
                      <TableRow key={slot.id}>
                        <TableCell className="font-mono">
                          {formatSlotTime(slot)}
                        </TableCell>
                        <TableCell>{slot.capacity ?? '—'}</TableCell>
                        <TableCell>{slot.booked ?? '—'}</TableCell>
                        <TableCell>
                          <Badge
                            variant={(slot.available ?? 0) > 0 ? 'success' : 'destructive'}
                          >
                            {slot.available ?? 0}
                          </Badge>
                        </TableCell>
                        <TableCell>{slot.teacher_name || slot.shift_slot || 'Any'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditSlot(slot)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteSlot(slot.id)}
                              disabled={(slot.booked ?? 0) > 0}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create Batch Dialog */}
      <Dialog open={showCreateBatch} onOpenChange={setShowCreateBatch}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create Time Slots (Batch)</DialogTitle>
            <DialogDescription>
              Create multiple time slots at once by specifying a date range and configuration
            </DialogDescription>
          </DialogHeader>
          <BatchTimeSlotForm
            onSubmit={handleCreateBatch}
            isLoading={createBatchSlots.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Time Slot</DialogTitle>
            <DialogDescription>
              Update the capacity for this time slot
            </DialogDescription>
          </DialogHeader>

          {editingSlot && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Date</p>
                  <p className="font-medium">{editingSlot.date}</p>
                </div>
                <div>
                  <p className="text-gray-500">Time</p>
                  <p className="font-medium">
                    {formatSlotTime(editingSlot)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Currently Booked</p>
                  <p className="font-medium">{editingSlot.booked ?? 0}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="capacity">New Capacity</Label>
                <Input
                  type="number"
                  id="capacity"
                  value={editCapacity}
                  onChange={(e) => setEditCapacity(parseInt(e.target.value, 10) || 0)}
                  min={editingSlot.booked ?? 0}
                />
                <p className="text-xs text-gray-500">
                  Capacity must be at least {editingSlot.booked ?? 0} (currently booked)
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateSlot}
              disabled={updateSlot.isPending || editCapacity < (editingSlot?.booked ?? 0)}
            >
              {updateSlot.isPending ? 'Updating...' : 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
