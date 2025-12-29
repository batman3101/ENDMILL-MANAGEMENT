import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

export const dynamic = 'force-dynamic'

// Body size 제한 증가 (20MB)
export const maxDuration = 60 // 최대 60초

// MIME 타입 매핑
const getMimeType = (fileExt: string): string => {
  const ext = fileExt?.toLowerCase() || 'jpg'
  const mimeTypes: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'bmp': 'image/bmp'
  }
  return mimeTypes[ext] || 'image/jpeg'
}

export async function POST(request: NextRequest) {
  try {
    // 먼저 사용자 인증 확인 (일반 클라이언트 사용)
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError) {
      logger.error('Auth error during upload:', authError)
      return NextResponse.json(
        { success: false, error: '인증 오류가 발생했습니다.' },
        { status: 401 }
      )
    }

    if (!user) {
      logger.error('No user found during upload')
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      )
    }

    logger.log('Upload request from user:', user.email)

    const body = await request.json()
    const { file, fileName, fileExt, bucket, folder } = body

    if (!file || !fileName || !bucket) {
      logger.error('Missing required fields:', { file: !!file, fileName, bucket })
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Base64를 Buffer로 변환
    const fileBuffer = Buffer.from(file, 'base64')

    // 파일 경로 생성
    const filePath = folder ? `${folder}/${fileName}` : fileName

    // MIME 타입 결정
    const contentType = getMimeType(fileExt)

    logger.log('Uploading file:', { filePath, contentType, size: fileBuffer.length })

    // Admin 클라이언트를 사용하여 RLS 우회하여 업로드
    const adminClient = createAdminClient()
    const { error: uploadError } = await adminClient.storage
      .from(bucket)
      .upload(filePath, fileBuffer, {
        contentType,
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      logger.error('Storage upload error:', uploadError)
      return NextResponse.json(
        { success: false, error: uploadError.message },
        { status: 500 }
      )
    }

    // Public URL 가져오기
    const { data: { publicUrl } } = adminClient.storage
      .from(bucket)
      .getPublicUrl(filePath)

    logger.log('Image uploaded successfully:', { filePath, publicUrl })

    return NextResponse.json({
      success: true,
      publicUrl,
      path: filePath
    })
  } catch (error) {
    logger.error('Error in POST /api/upload-image:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to upload image'
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}


