import { AlertTriangle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ServerErrorFrameProps {
  onRetry?: () => void;
}

export default function ServerErrorFrame({ onRetry }: ServerErrorFrameProps) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center">
      <Card className="max-w-md w-full text-center shadow-lg">
        <CardHeader>
          <div className="flex justify-center">
            <AlertTriangle className="h-12 w-12 text-red-500" />
          </div>
          <CardTitle className="text-6xl font-bold text-red-600">500</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-lg font-medium">
            Something went wrong on our side.
          </p>
          <Button
            variant="outline"
            onClick={onRetry || (() => window.location.reload())}
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
