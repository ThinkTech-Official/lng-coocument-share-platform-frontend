import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { LogOut, FileText, Video, Home, Search, X, ExternalLink, ChevronDown } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { getDocuments } from '../../api/documents';
import { getVideos } from '../../api/videos';
import Spinner from '../ui/Spinner';
import WeatherCards from '../ui/WeatherCards';

type SidebarItem = {
  id: string;
  title: string;
  type: 'document' | 'video';
  file_type?: string | null;
  category?: {
    id: string;
    name: string;
    parent_category_id: string | null;
    parent?: {
      id: string;
      name: string;
      parent_category_id: string | null;
      parent?: { id: string; name: string } | null;
    } | null;
  } | null;
};

type ChildGroup = {
  id: string;
  label: string;
  items: SidebarItem[];
};

type SubGroup = {
  id: string;
  label: string;
  items: SidebarItem[];
  childGroups: ChildGroup[];
};

type CategoryGroup = {
  id: string;
  label: string;
  subGroups: SubGroup[];
  items: SidebarItem[];
};

function groupByCategory(items: SidebarItem[]): CategoryGroup[] {
  const groups: Record<string, CategoryGroup> = {};

  for (const item of items) {
    if (!item.category) {
      if (!groups['uncategorized']) {
        groups['uncategorized'] = { id: 'uncategorized', label: 'Uncategorized', subGroups: [], items: [] };
      }
      groups['uncategorized'].items.push(item);
      continue;
    }

    const cat = item.category;

    if (!cat.parent_category_id) {
      // Level 0: item directly in a root category
      if (!groups[cat.id]) {
        groups[cat.id] = { id: cat.id, label: cat.name, subGroups: [], items: [] };
      }
      groups[cat.id].items.push(item);
    } else if (cat.parent && !cat.parent.parent_category_id) {
      // Level 1: subcategory — parent is a root
      const rootId = cat.parent.id;
      const rootName = cat.parent.name;
      if (!groups[rootId]) {
        groups[rootId] = { id: rootId, label: rootName, subGroups: [], items: [] };
      }
      let subGroup = groups[rootId].subGroups.find((sg) => sg.id === cat.id);
      if (!subGroup) {
        subGroup = { id: cat.id, label: cat.name, items: [], childGroups: [] };
        groups[rootId].subGroups.push(subGroup);
      }
      subGroup.items.push(item);
    } else if (cat.parent?.parent) {
      // Level 2: child subcategory — grandparent is root, parent is subcategory
      const rootId = cat.parent.parent.id;
      const rootName = cat.parent.parent.name;
      const subId = cat.parent.id;
      const subName = cat.parent.name;
      const childId = cat.id;
      const childName = cat.name;

      if (!groups[rootId]) {
        groups[rootId] = { id: rootId, label: rootName, subGroups: [], items: [] };
      }
      let subGroup = groups[rootId].subGroups.find((sg) => sg.id === subId);
      if (!subGroup) {
        subGroup = { id: subId, label: subName, items: [], childGroups: [] };
        groups[rootId].subGroups.push(subGroup);
      }
      let childGroup = subGroup.childGroups.find((cg) => cg.id === childId);
      if (!childGroup) {
        childGroup = { id: childId, label: childName, items: [] };
        subGroup.childGroups.push(childGroup);
      }
      childGroup.items.push(item);
    } else {
      // Fallback: treat parent as root
      const rootId = cat.parent?.id ?? cat.id;
      const rootName = cat.parent?.name ?? cat.name;
      if (!groups[rootId]) {
        groups[rootId] = { id: rootId, label: rootName, subGroups: [], items: [] };
      }
      groups[rootId].items.push(item);
    }
  }

  return Object.values(groups).sort((a, b) => {
    if (a.id === 'uncategorized') return 1;
    if (b.id === 'uncategorized') return -1;
    return a.label.localeCompare(b.label);
  });
}

const SidebarSkeleton = () => (
  <div className="space-y-4">
    {[1, 2, 3].map((i) => (
      <div key={i} className="bg-[#fafafa] border border-gray-200 p-4 animate-pulse">
        <div className="h-4 bg-gray-200 w-1/3 mb-4 rounded-sm"></div>
        <div className="space-y-3 mb-4">
          <div className="h-3 bg-gray-200 w-3/4 rounded-sm"></div>
          <div className="h-3 bg-gray-200 w-5/6 rounded-sm"></div>
          <div className="h-3 bg-gray-200 w-2/3 rounded-sm"></div>
        </div>
        <div className="mt-5">
          <div className="h-3 bg-gray-200 w-1/4 mb-3 ml-1"></div>
          <div className="space-y-3 pl-2">
            <div className="h-3 bg-gray-200 w-4/5 rounded-sm"></div>
            <div className="h-3 bg-gray-200 w-3/4 rounded-sm"></div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

export default function ContractorLayout() {
  const { clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (sectionKey: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  // Clear search query on navigation
  useEffect(() => {
    setSearchQuery('');
  }, [location.pathname]);

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  // Fetch documents for sidebar with infinite query
  const {
    data: docsInfiniteData,
    fetchNextPage: fetchNextDocsPage,
    hasNextPage: hasNextDocsPage,
    isFetchingNextPage: isFetchingNextDocsPage,
    isLoading: isDocsLoading,
  } = useInfiniteQuery({
    queryKey: ['contractor-documents-infinite'],
    queryFn: ({ pageParam = 1 }) => getDocuments({ limit: 15, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.meta.hasNextPage ? lastPage.meta.page + 1 : undefined,
  });

  // Fetch videos for sidebar with infinite query
  const {
    data: vidsInfiniteData,
    fetchNextPage: fetchNextVidsPage,
    hasNextPage: hasNextVidsPage,
    isFetchingNextPage: isFetchingNextVidsPage,
    isLoading: isVidsLoading,
  } = useInfiniteQuery({
    queryKey: ['contractor-videos-infinite'],
    queryFn: ({ pageParam = 1 }) => getVideos({ limit: 15, page: pageParam, is_live: true }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.meta.hasNextPage ? lastPage.meta.page + 1 : undefined,
  });

  const documents = docsInfiniteData?.pages.flatMap((page) => page.data) ?? [];
  const videos = vidsInfiniteData?.pages.flatMap((page) => page.data) ?? [];

  // Merge docs and videos into a single unified list
  const allItems: SidebarItem[] = [
    ...documents.map((d) => ({ id: d.id, title: d.title, type: 'document' as const, file_type: d.file_type ?? null, category: d.category })),
    ...videos.map((v) => ({ id: v.id, title: v.title, type: 'video' as const, file_type: null, category: v.category })),
  ];

  const grouped = groupByCategory(allItems);

  // Split into left/right columns
  const halfIndex = Math.ceil(grouped.length / 2);
  const leftGroups = grouped.slice(0, halfIndex);
  const rightGroups = grouped.slice(halfIndex);

  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Search both docs and videos
  const { data: searchDocsResponse, isLoading: isSearchDocsLoading } = useQuery({
    queryKey: ['contractor-search-documents', debouncedSearch],
    queryFn: () => getDocuments({ search: debouncedSearch, limit: 100 }),
    enabled: debouncedSearch.trim() !== '',
  });

  const { data: searchVidsResponse, isLoading: isSearchVidsLoading } = useQuery({
    queryKey: ['contractor-search-videos', debouncedSearch],
    queryFn: () => getVideos({ search: debouncedSearch, limit: 100 }),
    enabled: debouncedSearch.trim() !== '',
  });

  const searchDocs = searchDocsResponse?.data ?? [];
  const searchVids = searchVidsResponse?.data ?? [];
  const isSearchLoading = isSearchDocsLoading || isSearchVidsLoading;

  // Merge search results into unified list
  const searchResults: SidebarItem[] = [
    ...searchDocs.map((d) => ({ id: d.id, title: d.title, type: 'document' as const, file_type: d.file_type ?? null, category: d.category })),
    ...searchVids.map((v) => ({ id: v.id, title: v.title, type: 'video' as const, file_type: null, category: v.category })),
  ];

  // Window scroll listener for sidebar infinite scrolling — load both
  useEffect(() => {
    const handleScroll = () => {
      const threshold = 150;
      const totalHeight = document.documentElement.scrollHeight;
      const scrollPosition = window.innerHeight + window.scrollY;

      if (totalHeight - scrollPosition < threshold) {
        if (hasNextDocsPage && !isFetchingNextDocsPage) fetchNextDocsPage();
        if (hasNextVidsPage && !isFetchingNextVidsPage) fetchNextVidsPage();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasNextDocsPage, isFetchingNextDocsPage, fetchNextDocsPage, hasNextVidsPage, isFetchingNextVidsPage, fetchNextVidsPage]);

  const isFetchingNext = isFetchingNextDocsPage || isFetchingNextVidsPage;
  const isInitialLoading = isDocsLoading || isVidsLoading;

  const isLinkDoc = (item: SidebarItem) => item.type === 'document' && item.file_type === 'LINK';
  const linkFor = (item: SidebarItem) =>
    item.type === 'document' ? `/documents/${item.id}` : `/videos/${item.id}`;

  function renderSidebarItem(item: SidebarItem) {
    const to = linkFor(item);
    const isActive = location.pathname === to;
    const isLink = isLinkDoc(item);

    if (isLink) {
      return (
        <li key={`${item.type}-${item.id}`}>
          <Link
            to={to}
            className="flex items-center gap-1 text-sm leading-relaxed transition-colors hover:underline text-gray-600 w-full text-left"
          >
            {item.title}
            <ExternalLink size={10} className="shrink-0 opacity-60" />
          </Link>
        </li>
      );
    }


    return (
      <li key={`${item.type}-${item.id}`}>
        <Link
          to={to}
          className={`block text-sm leading-relaxed transition-colors hover:underline ${isActive ? 'text-lng-red font-bold underline' : 'text-gray-600'
            }`}
        >
          {item.title}
        </Link>
      </li>
    );
  }

  function renderGroupSidebar(group: CategoryGroup) {
    return (
      <div
        key={group.id}
        className="bg-[#fafafa] border-8 border-[#E9EDEF] p-4"
      >
        <h3 className="text-[15px] font-bold text-lng-blue uppercase tracking-wider mb-2 pb-1 border-b border-gray-200">
          {group.label}
        </h3>

        {/* Items directly under root category (no subcategory) */}
        {group.items.length > 0 && (
          <ul className="space-y-1.5 mb-2">
            {group.items.map((item) => renderSidebarItem(item))}
          </ul>
        )}

        {/* Subcategory groups */}
        {group.subGroups.map((sub) => {
          const subKey = `${group.id}-${sub.id}`;
          const isSubCollapsed = collapsedSections[subKey] === true;

          return (
            <div key={sub.id} className="mt-2">
              <h4
                onClick={() => toggleSection(subKey)}
                className="flex items-center gap-1 text-[14px] font-semibold text-lng-blue uppercase tracking-wider mb-1 cursor-pointer select-none hover:text-lng-blue/80 transition-colors"
              >
                <ChevronDown
                  size={16}
                  className={`transform transition-transform duration-200 ${
                    isSubCollapsed ? '-rotate-90' : 'rotate-0'
                  }`}
                />
                {sub.label}
              </h4>

              {!isSubCollapsed && (
                <>
                  {/* Items directly in this subcategory */}
                  {sub.items.length > 0 && (
                    <ul className="space-y-1.5 pl-4 mb-2">
                      {sub.items.map((item) => renderSidebarItem(item))}
                    </ul>
                  )}

                  {/* Child subcategory groups */}
                  {sub.childGroups.map((child) => {
                    const childKey = `${group.id}-${sub.id}-${child.id}`;
                    const isChildCollapsed = collapsedSections[childKey] === true;

                    return (
                      <div key={child.id} className="mt-1.5 pl-4">
                        <h5
                          onClick={() => toggleSection(childKey)}
                          className="flex items-center gap-1 text-[13px] font-semibold text-lng-blue uppercase tracking-wider mb-1 cursor-pointer select-none hover:text-lng-blue/80 transition-colors"
                        >
                          <ChevronDown
                            size={12}
                            className={`transform transition-transform duration-200 ${
                              isChildCollapsed ? '-rotate-90' : 'rotate-0'
                            }`}
                          />
                          {child.label}
                        </h5>
                        {!isChildCollapsed && (
                          <ul className="space-y-1.5 pl-4">
                            {child.items.map((item) => renderSidebarItem(item))}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-sans flex flex-col">
      {/* Top menu bar */}
      <header className="flex h-11 items-center justify-between bg-lng-blue px-6 text-white text-xs">
        <div className="flex items-center gap-4">
          <Link
            to="/home"
            className="flex items-center gap-1 hover:text-lng-yellow transition-colors font-medium"
          >
            <Home size={12} />
            Home
          </Link>
        </div>
        <div className="flex items-center gap-4">
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
        {/* Search bar */}
        <div className="flex justify-end px-3 py-1">
          <div className="relative flex items-center">
            <input
              type="text"
              placeholder="Search documents & videos..."
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
                <X size={14} className="text-gray-600 hover:text-gray-800" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="px-6">
        <WeatherCards />
      </div>



      {/* Main 3-Column Content Layout */}
      <div className="flex-1 max-w-[1600px] w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-3 p-3 sm:p-6">

        {/* Left Sidebar */}
        <aside className="lg:col-span-3 order-2 lg:order-1">
          {isInitialLoading ? (
            <SidebarSkeleton />
          ) : (
            <div className='rounded-md border-2 border-[#E9EDEF]'>{leftGroups.map((group) => renderGroupSidebar(group))}</div>
          )}
          {isFetchingNext && (
            <div className="flex justify-center py-3">
              <Spinner size="sm" />
            </div>
          )}
        </aside>

        {/* Center Section */}
        <main className="lg:col-span-6 flex flex-col bg-white border border-gray-100 rounded-sm shadow-sm p-2 sm:p-3 min-h-[500px] order-1 lg:order-2">
          {searchQuery.trim() !== '' ? (
            <div className="flex flex-col h-full flex-1 gap-4">
              <div className="border-b border-gray-100 pb-3 flex justify-between items-center">
                <h2 className="text-sm font-extrabold text-lng-blue uppercase tracking-wider">
                  {isSearchLoading
                    ? 'Searching...'
                    : `${searchResults.length} Search Results`}
                </h2>
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-xs text-lng-red hover:underline font-bold uppercase cursor-pointer"
                >
                  Clear
                </button>
              </div>

              <div className="space-y-3 flex-1 overflow-y-auto">
                {isSearchLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-lng-grey gap-2">
                    <Spinner size="md" />
                    <p className="text-xs">Searching...</p>
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-lng-grey gap-2">
                    <FileText size={32} className="text-gray-300" />
                    <p className="text-xs">No results found matching &ldquo;{searchQuery}&rdquo;</p>
                  </div>
                ) : (
                  searchResults.map((item) => {
                    const to = linkFor(item);
                    const isVideo = item.type === 'video';
                    const itemIsLink = isLinkDoc(item);
                    const cardContent = (
                      <div className="flex items-start gap-2.5">
                        <div className={`p-1.5 rounded-sm transition-colors mt-0.5 ${isVideo
                          ? 'bg-lng-orange/10 text-lng-orange group-hover:bg-lng-orange group-hover:text-white'
                          : 'bg-lng-blue/10 text-lng-blue group-hover:bg-lng-blue group-hover:text-white'
                          }`}>
                          {isVideo ? <Video size={14} /> : <FileText size={14} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-xs font-bold text-gray-800 transition-colors ${isVideo ? 'group-hover:text-lng-orange' : 'group-hover:text-lng-blue'}`}>
                              {item.title}
                            </span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider ${isVideo ? 'text-lng-orange bg-lng-orange/10' : 'text-lng-blue bg-lng-blue/10'}`}>
                              {isVideo ? 'Video' : 'Document'}
                            </span>
                            {itemIsLink && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider text-lng-blue bg-lng-blue/10 inline-flex items-center gap-0.5">
                                <ExternalLink size={8} />
                                External
                              </span>
                            )}
                            {item.category?.name && (
                              <span className="text-[9px] font-bold text-lng-red bg-lng-red/10 px-1.5 py-0.5 rounded-sm uppercase tracking-wider">
                                {item.category.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                    return (
                      <Link
                        key={`${item.type}-${item.id}`}
                        to={to}
                        onClick={() => setSearchQuery('')}
                        className={`block p-3 border border-gray-100 rounded-sm transition-all group ${isVideo
                          ? 'hover:border-lng-orange/40 hover:bg-lng-orange/5'
                          : 'hover:border-lng-blue/40 hover:bg-lng-blue/5'
                          }`}
                      >
                        {cardContent}
                      </Link>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <Outlet />
          )}
        </main>

        {/* Right Sidebar */}
        <aside className="lg:col-span-3 order-3 lg:order-3">
          {isInitialLoading ? (
            <SidebarSkeleton />
          ) : (
            <div className='rounded-md border-2 border-[#E9EDEF]'>{rightGroups.map((group) => renderGroupSidebar(group))}</div>
          )}
          {isFetchingNext && (
            <div className="flex justify-center py-3">
              <Spinner size="sm" />
            </div>
          )}
        </aside>

      </div>
    </div>
  );
}
