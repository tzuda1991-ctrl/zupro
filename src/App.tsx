import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { Drawer } from './components/Drawer';
import { BottomNav } from './components/BottomNav';
import { MarketList } from './components/MarketList';
import { BiddingModal } from './components/BiddingModal';
import { DepositScreen } from './components/DepositScreen';
import { WithdrawalScreen } from './components/WithdrawalScreen';
import { PassbookScreen } from './components/PassbookScreen';
import { GameHistoryScreen } from './components/GameHistoryScreen';
import { AdminPanel } from './components/AdminPanel';
import { GameRatesModal } from './components/GameRatesModal';
import { ChartsModal } from './components/ChartsModal';
import { NotificationsModal } from './components/NotificationsModal';
import { CodeGuideModal } from './components/CodeGuideModal';
import { StarlineScreen } from './components/StarlineScreen';
import { SupportFloat } from './components/SupportFloat';
import { Market } from './types';

const MainLayout: React.FC = () => {
  const { activeScreen, setActiveScreen, currentRole } = useApp();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isRatesOpen, setIsRatesOpen] = useState(false);
  const [biddingMarket, setBiddingMarket] = useState<Market | null>(null);
  const [chartMarket, setChartMarket] = useState<Market | null>(null);

  return (
    <div className="min-h-screen bg-[#070e1c] text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Top Fixed Header */}
      <Header
        onOpenDrawer={() => setIsDrawerOpen(true)}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
      />

      {/* Main Screen Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-3 sm:p-5">
        {activeScreen === 'home' && (
          <MarketList
            onSelectMarketForBidding={(m) => setBiddingMarket(m)}
            onOpenRates={() => setIsRatesOpen(true)}
            onOpenCharts={(m) => setChartMarket(m)}
          />
        )}

        {activeScreen === 'wallet' && <DepositScreen />}

        {activeScreen === 'withdraw' && <WithdrawalScreen />}

        {activeScreen === 'passbook' && <PassbookScreen />}

        {activeScreen === 'history' && <GameHistoryScreen />}

        {activeScreen === 'admin' && <AdminPanel />}

        {activeScreen === 'rates' && (
          <div className="py-4">
            <GameRatesModal isOpen={true} onClose={() => setActiveScreen('home')} />
          </div>
        )}

        {activeScreen === 'chart' && (
          <div className="py-4">
            <ChartsModal
              market={chartMarket || { id: 6, name: 'KALYAN', opens: '04:15 PM', closes: '06:15 PM', status: 'OPEN', is_active: true }}
              onClose={() => setActiveScreen('home')}
            />
          </div>
        )}

        {activeScreen === 'starline' && <StarlineScreen />}

        {activeScreen === 'code_guide' && <CodeGuideModal />}
      </main>

      {/* 24x7 WhatsApp & Telegram Floating Support Widget */}
      <SupportFloat />

      {/* Sticky Bottom Mobile Bar */}
      <BottomNav />

      {/* Global Modals & Drawers */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />

      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />

      {isRatesOpen && (
        <GameRatesModal
          isOpen={isRatesOpen}
          onClose={() => setIsRatesOpen(false)}
        />
      )}

      {chartMarket && (
        <ChartsModal
          market={chartMarket}
          onClose={() => setChartMarket(null)}
        />
      )}

      {biddingMarket && (
        <BiddingModal
          market={biddingMarket}
          onClose={() => setBiddingMarket(null)}
        />
      )}
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
