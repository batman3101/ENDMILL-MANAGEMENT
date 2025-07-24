'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)
  
  const supabase = createClientComponentClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email) {
      setError('이메일 주소를 입력해주세요.')
      return
    }

    setLoading(true)
    setError('')
    setMessage('')
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      
      if (error) {
        setError('비밀번호 재설정 요청 중 오류가 발생했습니다.')
      } else {
        setMessage('비밀번호 재설정 링크가 이메일로 전송되었습니다.')
        setIsSubmitted(true)
      }
    } catch (error) {
      console.error('비밀번호 재설정 오류:', error)
      setError('비밀번호 재설정 요청 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <div className="mx-auto h-12 w-12 bg-green-600 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              이메일 전송 완료
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              비밀번호 재설정 링크를 확인하세요
            </p>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-800">
                  <strong>{email}</strong>로 비밀번호 재설정 링크가 전송되었습니다.
                </p>
                <p className="text-sm text-green-700 mt-2">
                  이메일을 확인하고 링크를 클릭하여 새 비밀번호를 설정하세요.
                </p>
              </div>
            </div>
          </div>
          
          <div className="text-center space-y-2">
            <p className="text-sm text-gray-600">
              이메일이 도착하지 않았나요? 스팸 폴더를 확인해보세요.
            </p>
            <button
              onClick={() => {
                setIsSubmitted(false)
                setEmail('')
                setMessage('')
                setError('')
              }}
              className="text-sm text-blue-600 hover:text-blue-500 font-medium"
            >
              다시 시도하기
            </button>
            <div>
              <Link 
                href="/login"
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                ← 로그인으로 돌아가기
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 bg-blue-600 rounded-lg flex items-center justify-center">
            <Image
              src="/images/symbols/symbol BLUE.png"
              alt="ALMUS Symbol"
              width={32}
              height={32}
              className="w-8 h-8 object-contain"
            />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            비밀번호 재설정
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            등록된 이메일 주소를 입력하세요
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}
          
          {message && (
            <div className="bg-green-50 border border-green-200 rounded-md p-3">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-green-800">{message}</p>
                </div>
              </div>
            </div>
          )}
          
          <div>
            <label htmlFor="email-address" className="sr-only">
              이메일 주소
            </label>
            <input
              id="email-address"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (error) setError('')
              }}
              className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
              placeholder="이메일 주소"
              disabled={loading}
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || !email}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  전송 중...
                </>
              ) : (
                '재설정 링크 전송'
              )}
            </button>
          </div>

          <div className="text-center">
            <Link 
              href="/login"
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              ← 로그인으로 돌아가기
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}