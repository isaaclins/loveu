export default function middleware(request) {
  const userAgent = request.headers.get('user-agent') || '';
  const protocol = request.headers.get('x-forwarded-proto') || 'http'; // Vercel uses x-forwarded-proto

  // Check if it's an HTTP request and the User-Agent contains "curl"
  if (protocol === 'http' && userAgent.toLowerCase().includes('curl')) {
    return new Response('Hello World from your terminal!', {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  }

  // For all other requests, let Vercel's default handling take over.
  // In a generic Edge Function, not returning a Response object (or returning undefined)
  // allows the request to proceed to the origin or other routing rules (like vercel.json).
  return;
}

// Configure the middleware to run for all paths
export const config = {
  matcher: '/(.*)',
}; 
