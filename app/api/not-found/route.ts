import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json(
    {
      success: false,
      error: 'Resource not found',
      message: 'The requested resource does not exist.'
    },
    { status: 404 }
  )
}

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: 'Resource not found',
      message: 'The requested resource does not exist.'
    },
    { status: 404 }
  )
}

export async function PUT() {
  return NextResponse.json(
    {
      success: false,
      error: 'Resource not found',
      message: 'The requested resource does not exist.'
    },
    { status: 404 }
  )
}

export async function DELETE() {
  return NextResponse.json(
    {
      success: false,
      error: 'Resource not found',
      message: 'The requested resource does not exist.'
    },
    { status: 404 }
  )
}