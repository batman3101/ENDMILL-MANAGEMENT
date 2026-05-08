'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '../supabase/client'
import { RealtimeChannel } from '@supabase/supabase-js'
import { clientLogger } from '../utils/logger'

interface RealtimeHookOptions {
  table: string
  onInsert?: (payload: any) => void
  onUpdate?: (payload: any) => void
  onDelete?: (payload: any) => void
  enabled?: boolean
}

export function useRealtime({
  table,
  onInsert,
  onUpdate,
  onDelete,
  enabled = true
}: RealtimeHookOptions) {
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [channel, setChannel] = useState<RealtimeChannel | null>(null)

  // 콜백들을 ref로 저장해서 의존성 문제 해결
  const callbacksRef = useRef({ onInsert, onUpdate, onDelete })
  callbacksRef.current = { onInsert, onUpdate, onDelete }

  useEffect(() => {
    if (!enabled) return

    clientLogger.log(`🔄 Setting up realtime subscription for table: ${table}`)

    const channelName = `realtime:${table}`
    const realtimeChannel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table
        },
        (payload) => {
          clientLogger.log(`📡 Realtime event received for ${table}:`, payload)

          const { onInsert, onUpdate, onDelete } = callbacksRef.current

          switch (payload.eventType) {
            case 'INSERT':
              onInsert?.(payload)
              break
            case 'UPDATE':
              onUpdate?.(payload)
              break
            case 'DELETE':
              onDelete?.(payload)
              break
          }
        }
      )
      .subscribe((status) => {
        clientLogger.log(`📊 Realtime subscription status for ${table}:`, status)

        if (status === 'SUBSCRIBED') {
          setIsConnected(true)
          setError(null)
          clientLogger.log(`✅ Successfully subscribed to ${table} changes`)
        } else if (status === 'CHANNEL_ERROR') {
          setIsConnected(false)
          setError(`Failed to subscribe to ${table}`)
          clientLogger.error(`❌ Subscription error for ${table}`)
        } else if (status === 'TIMED_OUT') {
          setIsConnected(false)
          setError(`Connection timed out for ${table}`)
          clientLogger.error(`⏰ Subscription timeout for ${table}`)
        } else if (status === 'CLOSED') {
          setIsConnected(false)
          clientLogger.log(`🔌 Subscription closed for ${table}`)
        }
      })

    setChannel(realtimeChannel)

    return () => {
      clientLogger.log(`🔌 Cleaning up realtime subscription for ${table}`)
      realtimeChannel.unsubscribe()
      setIsConnected(false)
      setChannel(null)
    }
  }, [table, enabled]) // 콜백들을 의존성에서 제거

  return {
    isConnected,
    error,
    channel
  }
}

export function useMultiTableRealtime(tables: string[], callbacks?: {
  [tableName: string]: {
    onInsert?: (payload: any) => void
    onUpdate?: (payload: any) => void
    onDelete?: (payload: any) => void
  }
}) {
  const [connections, setConnections] = useState<{ [table: string]: boolean }>({})
  const [errors, setErrors] = useState<{ [table: string]: string | null }>({})

  // Use ref to store callbacks to avoid dependency issues
  const callbacksRef = useRef(callbacks)
  callbacksRef.current = callbacks

  // Memoize table list as string to avoid array reference changes
  const tablesKey = tables.join(',')

  useEffect(() => {
    const channels: RealtimeChannel[] = []

    tables.forEach(table => {
      const channelName = `realtime:${table}`
      const realtimeChannel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: table
          },
          (payload) => {
            clientLogger.log(`📡 Multi-table realtime event for ${table}:`, payload)

            const tableCallbacks = callbacksRef.current?.[table]
            if (tableCallbacks) {
              switch (payload.eventType) {
                case 'INSERT':
                  tableCallbacks.onInsert?.(payload)
                  break
                case 'UPDATE':
                  tableCallbacks.onUpdate?.(payload)
                  break
                case 'DELETE':
                  tableCallbacks.onDelete?.(payload)
                  break
              }
            }
          }
        )
        .subscribe((status) => {
          clientLogger.log(`📊 Multi-table subscription status for ${table}:`, status)

          // Update state individually to prevent object recreation loops
          if (status === 'SUBSCRIBED') {
            setConnections(prev => ({ ...prev, [table]: true }))
            setErrors(prev => ({ ...prev, [table]: null }))
          } else if (status === 'CHANNEL_ERROR') {
            setConnections(prev => ({ ...prev, [table]: false }))
            setErrors(prev => ({ ...prev, [table]: `Failed to subscribe to ${table}` }))
          } else if (status === 'TIMED_OUT') {
            setConnections(prev => ({ ...prev, [table]: false }))
            setErrors(prev => ({ ...prev, [table]: `Connection timed out for ${table}` }))
          } else if (status === 'CLOSED') {
            setConnections(prev => ({ ...prev, [table]: false }))
          }
        })

      channels.push(realtimeChannel)
    })

    return () => {
      clientLogger.log('🔌 Cleaning up all multi-table realtime subscriptions')
      channels.forEach(channel => channel.unsubscribe())
      setConnections({})
      setErrors({})
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tablesKey]) // Use tablesKey instead of tables and callbacks

  const isAllConnected = tables.every(table => connections[table] === true)
  const hasErrors = Object.values(errors).some(error => error !== null)

  return {
    connections,
    errors,
    isAllConnected,
    hasErrors
  }
}