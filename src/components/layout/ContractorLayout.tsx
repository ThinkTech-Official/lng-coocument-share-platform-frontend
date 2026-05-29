import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { LogOut, FileText, Video, Home, Search, X } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { getDocuments } from '../../api/documents';
import { getVideos } from '../../api/videos';
import Spinner from '../ui/Spinner';

// Helper to group items by category
function groupByCategory<T extends { category?: { id: string; name: string; parent_category_id: string | null; parent?: { id: string; name: string } | null } | null }>(
  items: T[]
): { id: string; label: string; items: T[] }[] {
  const groups: Record<string, { label: string; items: T[] }> = {};

  for (const item of items) {
    if (!item.category) {
      if (!groups['uncategorized']) {
        groups['uncategorized'] = { label: 'Uncategorized', items: [] };
      }
      groups['uncategorized'].items.push(item);
      continue;
    }

    const rootId = item.category.parent ? item.category.parent.id : item.category.id;
    const rootName = item.category.parent ? item.category.parent.name : item.category.name;

    if (!groups[rootId]) {
      groups[rootId] = { label: rootName, items: [] };
    }
    groups[rootId].items.push(item);
  }

  return Object.entries(groups)
    .sort(([aKey, aVal], [bKey, bVal]) => {
      if (aKey === 'uncategorized') return 1;
      if (bKey === 'uncategorized') return -1;
      return aVal.label.localeCompare(bVal.label);
    })
    .map(([key, val]) => ({ id: key, label: val.label, items: val.items }));
}

export default function ContractorLayout() {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  // Active Tab state
  const [activeTab, setActiveTab] = useState<'documents' | 'videos'>('documents');
  const [searchQuery, setSearchQuery] = useState('');

  // Clear search query on navigation
  useEffect(() => {
    setSearchQuery('');
  }, [location.pathname]);

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  const handleTabChange = (tab: 'documents' | 'videos') => {
    setActiveTab(tab);
    setSearchQuery('');
    // When changing tabs, automatically return to home page
    navigate('/home');
  };

  // Fetch documents and videos for sidebar menus with infinite query
  const {
    data: docsInfiniteData,
    fetchNextPage: fetchNextDocsPage,
    hasNextPage: hasNextDocsPage,
    isFetchingNextPage: isFetchingNextDocsPage,
  } = useInfiniteQuery({
    queryKey: ['contractor-documents-infinite'],
    queryFn: ({ pageParam = 1 }) => getDocuments({ limit: 15, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      return lastPage.meta.hasNextPage ? lastPage.meta.page + 1 : undefined;
    },
  });

  const {
    data: vidsInfiniteData,
    fetchNextPage: fetchNextVidsPage,
    hasNextPage: hasNextVidsPage,
    isFetchingNextPage: isFetchingNextVidsPage,
  } = useInfiniteQuery({
    queryKey: ['contractor-videos-infinite'],
    queryFn: ({ pageParam = 1 }) => getVideos({ limit: 15, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      return lastPage.meta.hasNextPage ? lastPage.meta.page + 1 : undefined;
    },
  });

  const documents = docsInfiniteData?.pages.flatMap((page) => page.data) ?? [];
  const videos = vidsInfiniteData?.pages.flatMap((page) => page.data) ?? [];

  const groupedDocs = groupByCategory(documents);
  const groupedVids = groupByCategory(videos);

  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch search results from backend using react-query hooks
  const { data: searchDocsResponse, isLoading: isSearchDocsLoading } = useQuery({
    queryKey: ['contractor-search-documents', debouncedSearch],
    queryFn: () => getDocuments({ search: debouncedSearch, limit: 100 }),
    enabled: activeTab === 'documents' && debouncedSearch.trim() !== '',
  });

  const { data: searchVidsResponse, isLoading: isSearchVidsLoading } = useQuery({
    queryKey: ['contractor-search-videos', debouncedSearch],
    queryFn: () => getVideos({ search: debouncedSearch, limit: 100 }),
    enabled: activeTab === 'videos' && debouncedSearch.trim() !== '',
  });

  const searchDocs = searchDocsResponse?.data ?? [];
  const searchVids = searchVidsResponse?.data ?? [];

  // Window scroll listener for sidebar infinite scrolling
  useEffect(() => {
    const handleScroll = () => {
      const threshold = 150; // px from bottom of screen
      const totalHeight = document.documentElement.scrollHeight;
      const scrollPosition = window.innerHeight + window.scrollY;

      if (totalHeight - scrollPosition < threshold) {
        if (activeTab === 'documents') {
          if (hasNextDocsPage && !isFetchingNextDocsPage) {
            fetchNextDocsPage();
          }
        } else {
          if (hasNextVidsPage && !isFetchingNextVidsPage) {
            fetchNextVidsPage();
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [activeTab, hasNextDocsPage, isFetchingNextDocsPage, fetchNextDocsPage, hasNextVidsPage, isFetchingNextVidsPage, fetchNextVidsPage]);

  // Split grouped categories in half for left and right columns
  const halfDocsIndex = Math.ceil(groupedDocs.length / 2);
  const leftDocs = groupedDocs.slice(0, halfDocsIndex);
  const rightDocs = groupedDocs.slice(halfDocsIndex);

  const halfVidsIndex = Math.ceil(groupedVids.length / 2);
  const leftVids = groupedVids.slice(0, halfVidsIndex);
  const rightVids = groupedVids.slice(halfVidsIndex);

  return (
    <div className="min-h-screen bg-white font-sans flex flex-col">
      {/* Top menu bar (lng-blue) */}
      <header className="flex h-11 items-center justify-between bg-lng-blue px-6 text-white text-xs">
        <div className="flex items-center gap-4">
          <Link
            to="/home"
            className="flex items-center gap-1 hover:text-lng-yellow transition-colors font-medium"
          >
            <Home size={12} />
            Home
          </Link>
          {/* <span className="text-white/70">Contractor Resource Portal</span> */}
        </div>

        {/* User + logout */}
        <div className="flex items-center gap-4">
          {/* <span className="font-medium text-white/90">{user?.name}</span> */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1 text-white/70 hover:text-lng-yellow transition-colors cursor-pointer"
          >
            <LogOut size={12} />
            Logout
          </button>
        </div>
      </header>

      {/* Central Header Zone */}
      <div className="bg-white py-3 sm:py-5 px-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-lng-red tracking-tight uppercase">
            LNG<span className="text-lng-blue"> CANADA</span>
          </h1>
          <p className="text-xs font-semibold text-lng-grey tracking-wide uppercase mt-0.5">
            Contractor Resource Site
          </p>
        </div>
      </div>

      <div className="flex justify-end px-3 py-1">
        <div className="relative flex items-center">
          <input
            type="text"
            placeholder={activeTab === 'documents' ? "Search documents..." : "Search videos..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-gray-50 hover:bg-gray-100 focus:bg-white text-gray-800 placeholder-gray-400 text-xs px-3 py-2 pl-8 pr-8 rounded-sm border border-gray-400 focus:border-lng-blue focus:outline-none focus:border-2 w-48 sm:w-60 transition-all font-normal normal-case peer"
          />
          <Search
            size={12}
            className="absolute left-2.5 pointer-events-none transition-colors text-gray-400 peer-focus:text-lng-blue"
          />
          {searchQuery && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                setSearchQuery('');
              }}
              className="absolute right-2.5 focus:outline-none cursor-pointer flex items-center justify-center"
            >
              <X
                size={14}
                className="text-gray-600 hover:text-gray-800"
              />
            </button>
          )}
        </div>
      </div>

      {/* Navigation Header Accent Bar (lng-red) with TAB switches & Search */}
      <div className="bg-lng-red h-9 flex items-center justify-between px-8 text-xs font-bold text-white uppercase tracking-wider">
        <div className="flex h-full">
          <button
            onClick={() => handleTabChange('documents')}
            className={`px-4 h-full flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'documents'
                ? 'bg-white text-lng-red'
                : 'hover:bg-white/10 text-white'
            }`}
          >
            <FileText size={13} />
            Documents
          </button>
          <button
            onClick={() => handleTabChange('videos')}
            className={`px-4 h-full flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'videos'
                ? 'bg-white text-lng-red'
                : 'hover:bg-white/10 text-white'
            }`}
          >
            <Video size={13} />
            Videos
          </button>
        </div>

        {/* Search input and accent label */}
        <div className="flex items-center gap-4">
          
          <span className="hidden md:inline text-white/80 text-[10px]">
            {activeTab === 'documents' ? 'Browse Documents & Policies' : 'Watch Videos'}
          </span>
        </div>
      </div>

      {/* Main 3-Column Content Layout */}
      <div className="flex-1 max-w-[1600px] w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 p-3 sm:p-6">
        
        {/* Left Sidebar — order-2 on mobile, natural on desktop */}
        <aside className="lg:col-span-3 space-y-6 order-2 lg:order-1">

          {activeTab === 'documents' ? (
            leftDocs.length === 0 ? null : (
              leftDocs.map((group) => (
                <div
                  key={group.id}
                  className="bg-[#fafafa] border-4 border-lng-blue p-4 rounded-sm shadow-sm"
                >
                  <h3 className="text-xs font-extrabold text-lng-red uppercase tracking-wider mb-2 pb-1 border-b border-gray-200">
                    {group.label}
                  </h3>
                  <ul className="space-y-1.5">
                    {group.items.map((doc) => {
                      const isActive = location.pathname === `/documents/${doc.id}`;
                      return (
                        <li key={doc.id}>
                          <Link
                            to={`/documents/${doc.id}`}
                            className={`block text-xs leading-relaxed transition-colors hover:text-lng-red hover:underline ${
                              isActive
                                ? 'text-lng-red font-bold underline'
                                : 'text-lng-blue'
                            }`}
                          >
                            {doc.title}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))
            )
          ) : (
            leftVids.length === 0 ? null : (
              leftVids.map((group) => (
                <div
                  key={group.id}
                  className="bg-[#fafafa] border-4 border-lng-orange p-4 rounded-sm shadow-sm"
                >
                  <h3 className="text-xs font-extrabold text-lng-blue uppercase tracking-wider mb-2 pb-1 border-b border-gray-200">
                    {group.label}
                  </h3>
                  <ul className="space-y-1.5">
                    {group.items.map((vid) => {
                      const isActive = location.pathname === `/videos/${vid.id}`;
                      return (
                        <li key={vid.id}>
                          <Link
                            to={`/videos/${vid.id}`}
                            className={`block text-xs leading-relaxed transition-colors hover:text-lng-red hover:underline ${
                              isActive
                                ? 'text-lng-red font-bold underline'
                                : 'text-lng-blue'
                            }`}
                          >
                            {vid.title}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))
            )
          )}
          {/* Infinite scroll loading indicator — left sidebar */}
          {(activeTab === 'documents' ? isFetchingNextDocsPage : isFetchingNextVidsPage) && (
            <div className="flex justify-center py-3">
              <Spinner size="sm" />
            </div>
          )}
        </aside>

        {/* Center Section — order-1 on mobile (shows first), natural on desktop */}
        <main className="lg:col-span-6 flex flex-col bg-white border border-gray-100 rounded-sm shadow-sm p-2 sm:p-5 min-h-[500px] order-1 lg:order-2">
          {searchQuery.trim() !== '' ? (
            <div className="flex flex-col h-full flex-1 gap-4">
              <div className="border-b border-gray-100 pb-3 flex justify-between items-center">
                <div>
                  <h2 className="text-sm font-extrabold text-lng-blue uppercase tracking-wider">
                    {activeTab === 'documents'
                      ? isSearchDocsLoading ? 'Searching Documents...' : `${searchDocs.length} Search Results`
                      : isSearchVidsLoading ? 'Searching Videos...' : `${searchVids.length} Search Results`
                    }
                  </h2>
                </div>
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-xs text-lng-red hover:underline font-bold uppercase cursor-pointer"
                >
                  Clear
                </button>
              </div>

              <div className="space-y-3 flex-1 overflow-y-auto">
                {activeTab === 'documents' ? (
                  isSearchDocsLoading ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center text-lng-grey gap-2">
                      <Spinner size="md" />
                      <p className="text-xs">Searching documents...</p>
                    </div>
                  ) : searchDocs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center text-lng-grey gap-2">
                      <FileText size={32} className="text-gray-300" />
                      <p className="text-xs">No documents found matching &ldquo;{searchQuery}&rdquo;</p>
                    </div>
                  ) : (
                    searchDocs.map((doc) => (
                      <Link
                        key={doc.id}
                        to={`/documents/${doc.id}`}
                        onClick={() => setSearchQuery('')}
                        className="block p-3 border border-gray-100 rounded-sm hover:border-lng-blue-40 hover:bg-lng-blue/5 transition-all group"
                      >
                        <div className="flex items-start gap-2.5">
                          <div className="p-1.5 bg-lng-blue/10 text-lng-blue rounded-sm group-hover:bg-lng-blue group-hover:text-white transition-colors mt-0.5">
                            <FileText size={14} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-gray-800 group-hover:text-lng-blue transition-colors">
                                {doc.title}
                              </span>
                              {doc.category?.name && (
                                <span className="text-[9px] font-bold text-lng-red bg-lng-red/10 px-1.5 py-0.5 rounded-sm uppercase tracking-wider">
                                  {doc.category.name}
                                </span>
                              )}
                            </div>
                            {doc.description && (
                              <p className="text-xs text-lng-grey mt-1 line-clamp-2">
                                {doc.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))
                  )
                ) : (
                  isSearchVidsLoading ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center text-lng-grey gap-2">
                      <Spinner size="md" />
                      <p className="text-xs">Searching videos...</p>
                    </div>
                  ) : searchVids.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center text-lng-grey gap-2">
                      <Video size={32} className="text-gray-300" />
                      <p className="text-xs">No videos found matching &ldquo;{searchQuery}&rdquo;</p>
                    </div>
                  ) : (
                    searchVids.map((vid) => (
                      <Link
                        key={vid.id}
                        to={`/videos/${vid.id}`}
                        onClick={() => setSearchQuery('')}
                        className="block p-3 border border-gray-100 rounded-sm hover:border-lng-orange/40 hover:bg-lng-orange/5 transition-all group"
                      >
                        <div className="flex items-start gap-2.5">
                          <div className="p-1.5 bg-lng-orange/10 text-lng-orange rounded-sm group-hover:bg-lng-orange group-hover:text-white transition-colors mt-0.5">
                            <Video size={14} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-gray-800 group-hover:text-lng-orange transition-colors">
                                {vid.title}
                              </span>
                              {vid.category?.name && (
                                <span className="text-[9px] font-bold text-lng-blue bg-lng-blue/10 px-1.5 py-0.5 rounded-sm uppercase tracking-wider">
                                  {vid.category.name}
                                </span>
                              )}
                            </div>
                            {vid.description && (
                              <p className="text-xs text-lng-grey mt-1 line-clamp-2">
                                {vid.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))
                  )
                )}
              </div>
            </div>
          ) : (
            <Outlet />
          )}
        </main>

        {/* Right Sidebar — order-3 on mobile and desktop */}
        <aside className="lg:col-span-3 space-y-6 order-3 lg:order-3">

          {activeTab === 'documents' ? (
            rightDocs.length === 0 ? null : (
              rightDocs.map((group) => (
                <div
                  key={group.id}
                  className="bg-[#fafafa] border-4 border-lng-blue p-4 rounded-sm shadow-sm"
                >
                  <h3 className="text-xs font-extrabold text-lng-red uppercase tracking-wider mb-2 pb-1 border-b border-gray-200">
                    {group.label}
                  </h3>
                  <ul className="space-y-1.5">
                    {group.items.map((doc) => {
                      const isActive = location.pathname === `/documents/${doc.id}`;
                      return (
                        <li key={doc.id}>
                          <Link
                            to={`/documents/${doc.id}`}
                            className={`block text-xs leading-relaxed transition-colors hover:text-lng-red hover:underline ${
                              isActive
                                ? 'text-lng-red font-bold underline'
                                : 'text-lng-blue'
                            }`}
                          >
                            {doc.title}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))
            )
          ) : (
            rightVids.length === 0 ? null : (
              rightVids.map((group) => (
                <div
                  key={group.id}
                  className="bg-[#fafafa] border-4 border-lng-orange p-4 rounded-sm shadow-sm"
                >
                  <h3 className="text-xs font-extrabold text-lng-blue uppercase tracking-wider mb-2 pb-1 border-b border-gray-200">
                    {group.label}
                  </h3>
                  <ul className="space-y-1.5">
                    {group.items.map((vid) => {
                      const isActive = location.pathname === `/videos/${vid.id}`;
                      return (
                        <li key={vid.id}>
                          <Link
                            to={`/videos/${vid.id}`}
                            className={`block text-xs leading-relaxed transition-colors hover:text-lng-red hover:underline ${
                              isActive
                                ? 'text-lng-red font-bold underline'
                                : 'text-lng-blue'
                            }`}
                          >
                            {vid.title}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))
            )
          )}
          {/* Infinite scroll loading indicator — right sidebar */}
          {(activeTab === 'documents' ? isFetchingNextDocsPage : isFetchingNextVidsPage) && (
            <div className="flex justify-center py-3">
              <Spinner size="sm" />
            </div>
          )}
        </aside>

      </div>
    </div>
  );
}
