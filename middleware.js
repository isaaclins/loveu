import { NextResponse } from 'next/server';

export function middleware(request) {
  const userAgent = request.headers.get('user-agent') || '';
  const protocol = request.headers.get('x-forwarded-proto') || 'http'; // Vercel uses x-forwarded-proto

  // Check if it's an HTTP request and the User-Agent contains "curl"
  if (protocol === 'http' && userAgent.toLowerCase().includes('curl')) {
    return new NextResponse('Hello World from your terminal!', {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  }

  // For all other requests (including HTTPS curl or browser requests),
  // let them proceed to Vercel's default handling (which includes vercel.json rewrites)
  return NextResponse.next();
}

// Configure the middleware to run for all paths
export const config = {
  matcher: '/(.*)',
}; 
