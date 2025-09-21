import { SearchX } from 'lucide-react';
import { Link } from 'react-router-dom';

import logo from '@/assets/react.svg';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function NotFoundPage() {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-muted/30 p-4 space-y-6">
      <div className="flex items-center gap-1">
        <img src={logo} alt="Logo" className="w-8 h-8" />
        <p className="text-2xl font-sans font-medium">DEMO</p>
      </div>

      <Card className="max-w-md w-full text-center shadow-lg">
        <CardHeader>
          <div className="flex justify-center">
            <SearchX className="h-12 w-12 text-muted-foreground" />
          </div>
          <CardTitle className="text-6xl font-bold">404</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-lg font-medium">
            Oops! We couldn’t find that page.
          </p>
          <Button asChild className="mt-2">
            <Link to="/">Back to Home</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
