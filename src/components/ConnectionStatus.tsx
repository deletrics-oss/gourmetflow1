import { useState } from 'react';
import { Wifi, WifiOff, RefreshCw, Cloud, CloudOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { cn } from '@/lib/utils';

interface ConnectionStatusProps {
  showDetails?: boolean;
  className?: string;
}

export function ConnectionStatus({ showDetails = false, className }: ConnectionStatusProps) {
  const { isOnline, isSyncing, syncStats, lastSyncTime, syncNow } = useOfflineSync();
  const [isOpen, setIsOpen] = useState(false);

  const hasPendingData = syncStats.pendingOrders > 0 || syncStats.pendingCustomers > 0;
  const totalPending = syncStats.pendingOrders + syncStats.pendingCustomers;

  // Simple indicator for compact view
  if (!showDetails) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn('flex items-center gap-1', className)}>
              {isOnline ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-destructive" />
              )}
              {hasPendingData && (
                <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                  {totalPending}
                </Badge>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {isOnline ? 'Online' : 'Offline'}
              {hasPendingData && ` - ${totalPending} pendente(s)`}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Detailed popover view
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn('gap-2', className)}
        >
          {isOnline ? (
            <Cloud className="h-4 w-4 text-green-500" />
          ) : (
            <CloudOff className="h-4 w-4 text-destructive" />
          )}
          <span className="hidden sm:inline">
            {isOnline ? 'Online' : 'Offline'}
          </span>
          {hasPendingData && (
            <Badge 
              variant={isOnline ? 'secondary' : 'destructive'} 
              className="h-5 px-1.5 text-xs"
            >
              {totalPending}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end">
        <div className="space-y-4">
          {/* Status Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isOnline ? (
                <>
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="font-medium text-green-600">Conectado</span>
                </>
              ) : (
                <>
                  <div className="h-2 w-2 rounded-full bg-destructive" />
                  <span className="font-medium text-destructive">Sem conexão</span>
                </>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => syncNow()}
              disabled={!isOnline || isSyncing}
            >
              {isSyncing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Offline Mode Info */}
          {!isOnline && (
            <div className="rounded-md bg-muted p-3 text-sm">
              <p className="font-medium mb-1">Modo Offline Ativo</p>
              <p className="text-muted-foreground text-xs">
                Seus pedidos e cadastros estão sendo salvos localmente.
                Quando a conexão voltar, tudo será sincronizado automaticamente.
              </p>
            </div>
          )}

          {/* Pending Items */}
          {hasPendingData && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Dados Pendentes</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {syncStats.pendingOrders > 0 && (
                  <div className="flex items-center justify-between rounded-md bg-muted px-3 py-2">
                    <span className="text-muted-foreground">Pedidos</span>
                    <Badge variant="outline">{syncStats.pendingOrders}</Badge>
                  </div>
                )}
                {syncStats.pendingCustomers > 0 && (
                  <div className="flex items-center justify-between rounded-md bg-muted px-3 py-2">
                    <span className="text-muted-foreground">Clientes</span>
                    <Badge variant="outline">{syncStats.pendingCustomers}</Badge>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Last Sync Time */}
          {lastSyncTime && (
            <div className="text-xs text-muted-foreground border-t pt-2">
              Última sincronização:{' '}
              {lastSyncTime.toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          )}

          {/* All Synced Message */}
          {isOnline && !hasPendingData && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <Cloud className="h-4 w-4" />
              <span>Todos os dados sincronizados</span>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
