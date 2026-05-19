'use client'

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAcademyUsers } from '@/api/users'
import type { User } from '@/types'

interface TeacherSelectProps {
  value?: string
  onChange: (teacherId: string) => void
  excludeUserId?: string
  className?: string
}

export const TeacherSelect = ({
  value,
  onChange,
  excludeUserId,
  className,
}: TeacherSelectProps) => {
  const navigate = useNavigate()
  const { data: users, isLoading } = useAcademyUsers()
  const [search, setSearch] = useState('')

  const teachers = users?.filter((u: User) => {
    const isTeacher = u.role === 'teacher'
    const notExcluded = u.id !== excludeUserId
    const matchesSearch = search
      ? u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
      : true
    return isTeacher && notExcluded && matchesSearch
  }) || []

  const handleSelectChange = (newValue: string) => {
    if (newValue === '__manage__') {
      navigate('/admin/users?role=teacher')
      return
    }
    onChange(newValue)
  }

  return (
    <div className={className}>
      <div className="relative mb-2">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search teachers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <Select value={value} onValueChange={handleSelectChange}>
        <SelectTrigger>
          <SelectValue placeholder={isLoading ? 'Loading teachers...' : 'Select a teacher'} />
        </SelectTrigger>
        <SelectContent>
          {teachers.length === 0 && !isLoading && (
            <div className="p-4 text-center text-sm text-gray-500">
              No teachers found
            </div>
          )}
          {teachers.map((teacher: User) => (
            <SelectItem key={teacher.id} value={teacher.id}>
              <div className="flex items-center gap-2">
                {teacher.avatar ? (
                  <img
                    src={teacher.avatar}
                    alt={teacher.name}
                    className="h-6 w-6 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-xs font-medium text-primary">
                      {teacher.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="flex flex-col">
                  <span>{teacher.name}</span>
                  <span className="text-xs text-gray-500">{teacher.email}</span>
                </div>
              </div>
            </SelectItem>
          ))}
          <SelectItem value="__manage__" className="text-primary">
            + Manage Teachers
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
