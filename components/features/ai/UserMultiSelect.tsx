'use client'

/**
 * UserMultiSelect Component
 * 사용자 다중 선택 컴포넌트
 */

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { Search, X, User } from 'lucide-react'
import { useDebounce } from '@/lib/hooks/useDebounce'

interface UserProfile {
  user_id: string
  name: string
  employee_id: string
  email?: string
}

interface UserMultiSelectProps {
  selectedUserIds: string[]
  onSelectionChange: (userIds: string[]) => void
  className?: string
}

export function UserMultiSelect({
  selectedUserIds,
  onSelectionChange,
  className,
}: UserMultiSelectProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [users, setUsers] = useState<UserProfile[]>([])
  const [selectedUsers, setSelectedUsers] = useState<UserProfile[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const debouncedSearch = useDebounce(searchQuery, 300)

  // 사용자 검색
  useEffect(() => {
    const searchUsers = async () => {
      if (!debouncedSearch) {
        setUsers([])
        return
      }

      setIsLoading(true)
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('user_id, name, employee_id')
          .or(`name.ilike.%${debouncedSearch}%,employee_id.ilike.%${debouncedSearch}%`)
          .limit(10)

        if (error) throw error

        // user_id가 null이 아닌 것만 필터링
        const validUsers = (data || []).filter(user => user.user_id !== null) as UserProfile[]
        setUsers(validUsers)
      } catch (error) {
        console.error('사용자 검색 오류:', error)
        setUsers([])
      } finally {
        setIsLoading(false)
      }
    }

    searchUsers()
  }, [debouncedSearch])

  // 선택된 사용자 정보 로드
  useEffect(() => {
    const loadSelectedUsers = async () => {
      if (selectedUserIds.length === 0) {
        setSelectedUsers([])
        return
      }

      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('user_id, name, employee_id')
          .in('user_id', selectedUserIds)

        if (error) throw error

        // user_id가 null이 아닌 것만 필터링
        const validUsers = (data || []).filter(user => user.user_id !== null) as UserProfile[]
        setSelectedUsers(validUsers)
      } catch (error) {
        console.error('선택된 사용자 로드 오류:', error)
      }
    }

    loadSelectedUsers()
  }, [selectedUserIds])

  // 사용자 선택/해제
  const handleToggleUser = (userId: string) => {
    const newSelectedIds = selectedUserIds.includes(userId)
      ? selectedUserIds.filter((id) => id !== userId)
      : [...selectedUserIds, userId]

    onSelectionChange(newSelectedIds)
  }

  // 사용자 제거
  const handleRemoveUser = (userId: string) => {
    const newSelectedIds = selectedUserIds.filter((id) => id !== userId)
    onSelectionChange(newSelectedIds)
  }

  return (
    <div className={className}>
      {/* 선택된 사용자 목록 */}
      {selectedUsers.length > 0 && (
        <div className="mb-4">
          <div className="text-sm font-medium mb-2">
            선택된 사용자 ({selectedUsers.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedUsers.map((user) => (
              <Badge key={user.user_id} variant="secondary" className="gap-1">
                {user.name}
                <button
                  onClick={() => handleRemoveUser(user.user_id)}
                  className="ml-1 hover:text-red-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* 검색 입력 */}
      <div className="relative mb-2">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="이름 또는 이메일로 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* 검색 결과 */}
      {searchQuery && (
        <ScrollArea className="h-[200px] border rounded-md">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              검색 중...
            </div>
          ) : users.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              검색 결과가 없습니다.
            </div>
          ) : (
            <div className="p-2">
              {users.map((user) => (
                <div
                  key={user.user_id}
                  className="flex items-center gap-3 p-2 hover:bg-accent rounded-md cursor-pointer"
                  onClick={() => handleToggleUser(user.user_id)}
                >
                  <Checkbox
                    checked={selectedUserIds.includes(user.user_id)}
                    onCheckedChange={() => handleToggleUser(user.user_id)}
                  />
                  <div className="flex items-center gap-2 flex-1">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="text-sm font-medium">{user.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {user.employee_id}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      )}
    </div>
  )
}
