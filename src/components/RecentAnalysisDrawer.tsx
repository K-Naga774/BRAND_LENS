import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Clock,
  FileText,
  Image as ImageIcon,
  ArrowUpRight,
  ShieldAlert,
  CheckCircle2,
  Database,
} from 'lucide-react';
import { ContentItem } from '../engine/types';

export interface EnrichedRecentReport extends ContentItem {
  open_findings?: number;
  open_high?: number;
  versionCount?: number;
}

interface RecentAnalysisDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  recentReports: EnrichedRecentReport[];
  selectedContentId?: number;
  onSelectReport: (id: number) => void;
}

export const RecentAnalysisDrawer: React.FC<RecentAnalysisDrawerProps> = ({
  isOpen,
  onClose,
  recentReports,
  selectedContentId,
  onSelectReport,
}) => {
  const lastFiveReports = recentReports.slice(0, 5);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs"
            aria-hidden="true"
          />

          {/* Slide-over Sidebar Drawer */}
          <motion.aside
            role="dialog"
            aria-label="Recent Analysis Reports Drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-md bg-white dark:bg-[#161618] border-l border-black/[0.08] dark:border-white/[0.1] shadow-2xl flex flex-col justify-between"
          >
            {/* Drawer Header */}
            <div className="p-6 border-b border-black/[0.08] dark:border-white/[0.1] flex items-center justify-between gap-4 bg-[#1D1D1F] text-white">
              <div className="space-y-0.5">
                <div className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-[#66B2FF]">
                  <Database className="w-3.5 h-3.5" />
                  <span>ONLINE GOVERNANCE STORAGE · LAST 5</span>
                </div>
                <h2 className="text-base font-bold text-white">Recent Analysis Reports</h2>
              </div>

              <button
                type="button"
                aria-label="Close Recent Analysis Drawer"
                onClick={onClose}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Reports List (Last 5) */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
              <div className="flex items-center justify-between text-xs text-[#6E6E73]">
                <span>Showing {lastFiveReports.length} of last 5 reports</span>
                <span className="font-mono text-[#0071E3]">Click to load report</span>
              </div>

              {lastFiveReports.length === 0 ? (
                <div className="p-8 rounded-2xl bg-[#F5F5F7] text-center space-y-2">
                  <Clock className="w-6 h-6 text-[#6E6E73] mx-auto" />
                  <p className="text-xs font-semibold text-[#1D1D1F]">No Recent Reports Yet</p>
                  <p className="text-xs text-[#6E6E73]">
                    Run a Brand Lens analysis to populate your recent report history.
                  </p>
                </div>
              ) : (
                lastFiveReports.map((item, idx) => {
                  const openCount = item.open_findings ?? 0;
                  const highCount = item.open_high ?? 0;
                  const estScore = Math.max(
                    12,
                    Math.min(100, 100 - highCount * 18 - Math.max(0, openCount - highCount) * 8)
                  );
                  const isActive = item.id === selectedContentId;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onSelectReport(item.id);
                        onClose();
                      }}
                      className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer space-y-2.5 ${
                        isActive
                          ? 'bg-[#0071E3]/[0.08] border-[#0071E3] shadow-xs'
                          : 'bg-[#F5F5F7] hover:bg-black/[0.04] border-black/[0.08]'
                      }`}
                    >
                      {/* Top Row: Index + Channel/Kind + Timestamp */}
                      <div className="flex items-center justify-between gap-2 text-[11px] text-[#6E6E73] font-mono tabular-nums">
                        <span className="inline-flex items-center gap-1.5 font-semibold text-[#0071E3]">
                          {item.kind === 'image' ? (
                            <ImageIcon className="w-3.5 h-3.5" />
                          ) : (
                            <FileText className="w-3.5 h-3.5" />
                          )}
                          <span>
                            #{idx + 1} · {item.channel}
                          </span>
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{item.updated_at || item.created_at}</span>
                        </span>
                      </div>

                      {/* Report Title */}
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-bold text-[#1D1D1F] leading-snug line-clamp-2">
                          {item.title}
                        </h3>
                        <ArrowUpRight className="w-4 h-4 text-[#0071E3] shrink-0 mt-0.5" />
                      </div>

                      {/* Brief Summary Metadata */}
                      <div className="pt-1 border-t border-black/[0.06] flex flex-wrap items-center justify-between gap-2 text-xs tabular-nums">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-[#1D1D1F]">
                            Score: {estScore}/100
                          </span>
                          <span>·</span>
                          {openCount === 0 ? (
                            <span className="inline-flex items-center gap-1 text-[#0071E3] font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Compliant</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[#1D1D1F] font-medium">
                              <ShieldAlert className="w-3.5 h-3.5 text-[#0071E3]" />
                              <span>
                                {openCount} findings ({highCount} high)
                              </span>
                            </span>
                          )}
                        </div>

                        <span className="font-mono text-[11px] uppercase px-2 py-0.5 rounded bg-white border border-black/[0.08] text-[#1D1D1F]">
                          Route: {item.route} · v{item.versionCount || 1}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-black/[0.08] dark:border-white/[0.1] bg-[#F5F5F7] text-xs text-[#6E6E73] flex items-center justify-between">
              <span>Persisted in Online Workspace DB</span>
              <span className="font-mono text-[#1D1D1F]">Max 5 Recent Reports</span>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};
