import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const userAgent = request.headers.get('user-agent') || '';
  const protocol = request.headers.get('x-forwarded-proto') || 'http'; // Vercel uses x-forwarded-proto

  // Check if it's an HTTP request and User-Agent is curl
  if (protocol === 'http' && userAgent.toLowerCase().includes('curl')) {
    // Attempt to respond directly over HTTP for 'curl loveu.ch'
    const curlScriptContent = 'echo Hello World from your terminal!\n(served directly via HTTP by middleware)';
    return new NextResponse(curlScriptContent, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  // For all other cases (HTTPS, other user agents, etc.),
  // let the request proceed to be handled by Vercel's routing (including HTTPS redirect)
  // and your vercel.json rules.
  return NextResponse.next();
}

// Define which paths the middleware should run on.
// Running on all paths to catch the root request.
export const config = {
  matcher: '/(.*)',
}; 
