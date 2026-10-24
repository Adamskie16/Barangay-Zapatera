// Resident/src/components/BottomNav.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Animated,
  LayoutChangeEvent,
} from 'react-native';
import {
  Landmark,
  FileBadge,
  Plus,
  Newspaper,
  UserCheck,
} from 'lucide-react';
import { ensureInterFontLoaded } from '../core/fontSetup';

export type NavTab = 'home' | 'documents' | 'requests' | 'announcements' | 'profile';

interface BottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  activeRequestsCount?: number;
  onRequestClick?: () => void;
}

const BAR_HEIGHT = 72;
const ORB_SIZE = 54;
const NOTCH_HALF_WIDTH = 48;
const NOTCH_DEPTH = 32;

/**
 * Generates the exact SVG path from the reference image:
 * A white rounded pill bar with a fixed, smooth concave U-shaped cradle in the exact center.
 */
function buildCenterNotchedBarPath(width: number, height: number): string {
  const w = Math.max(width, 280);
  const h = height;
  const cx = w / 2;
  const rTop = 26;
  const rBottom = 22;

  const notchStart = cx - NOTCH_HALF_WIDTH;
  const notchEnd = cx + NOTCH_HALF_WIDTH;

  const cp1x = cx - NOTCH_HALF_WIDTH * 0.52;
  const cp2x = cx - NOTCH_HALF_WIDTH * 0.44;
  const cp3x = cx + NOTCH_HALF_WIDTH * 0.44;
  const cp4x = cx + NOTCH_HALF_WIDTH * 0.52;

  return [
    `M 0 ${rTop}`,
    `Q 0 0 ${rTop} 0`,
    `L ${notchStart} 0`,
    `C ${cp1x} 0, ${cp2x} ${NOTCH_DEPTH}, ${cx} ${NOTCH_DEPTH}`,
    `C ${cp3x} ${NOTCH_DEPTH}, ${cp4x} 0, ${notchEnd} 0`,
    `L ${w - rTop} 0`,
    `Q ${w} 0 ${w} ${rTop}`,
    `L ${w} ${h - rBottom}`,
    `Q ${w} ${h} ${w - rBottom} ${h}`,
    `L ${rBottom} ${h}`,
    `Q 0 ${h} 0 ${h - rBottom}`,
    'Z',
  ].join(' ');
}

/**
 * Formal Two-Tone Icons matching the reference image's style:
 * - Inactive: Clean slate-grey (#7c8594) outline
 * - Active: Deep navy stroke (#1e3a8a) + royal blue two-tone fill (#4361ee) + subtle active motion dashes
 */
function FormalNavIcon({
  tab,
  isActive,
}: {
  tab: Exclude<NavTab, 'requests'>;
  isActive: boolean;
}) {
  if (Platform.OS !== 'web') {
    const color = isActive ? '#1e3a8a' : '#7c8594';
    const strokeWidth = isActive ? 2.3 : 1.9;
    if (tab === 'home') return <Landmark size={21} color={color} strokeWidth={strokeWidth} />;
    if (tab === 'documents') return <FileBadge size={21} color={color} strokeWidth={strokeWidth} />;
    if (tab === 'announcements') return <Newspaper size={21} color={color} strokeWidth={strokeWidth} />;
    return <UserCheck size={21} color={color} strokeWidth={strokeWidth} />;
  }

  const strokeColor = isActive ? '#1e3a8a' : '#7c8594';
  const accentFill = isActive ? '#4361ee' : 'none';
  const softFill = isActive ? 'rgba(67, 97, 238, 0.16)' : 'none';

  if (tab === 'home') {
    // Formal Civic Hall / Executive Ledger Icon
    return (
      <svg width="24" height="24" viewBox="0 0 26 26" fill="none">
        {isActive && (
          <path
            d="M4 10.5L13 4.5L22 10.5H4Z"
            fill={accentFill}
          />
        )}
        <path
          d="M3.5 10.5L13 4L22.5 10.5H3.5Z"
          stroke={strokeColor}
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <rect
          x="5.5"
          y="10.5"
          width="15"
          height="9.5"
          rx="1.5"
          fill={softFill}
          stroke={strokeColor}
          strokeWidth="1.8"
        />
        <path
          d="M10 14V20M16 14V20M3.5 20H22.5"
          stroke={strokeColor}
          strokeWidth="1.9"
          strokeLinecap="round"
        />
        {isActive && (
          <>
            <line x1="5" y1="23.2" x2="11" y2="23.2" stroke="#1e3a8a" strokeWidth="1.9" strokeLinecap="round" />
            <line x1="14" y1="23.2" x2="17" y2="23.2" stroke="#4361ee" strokeWidth="1.9" strokeLinecap="round" />
          </>
        )}
      </svg>
    );
  }

  if (tab === 'documents') {
    // Formal Official Certificate / Document Folio Icon
    return (
      <svg width="24" height="24" viewBox="0 0 26 26" fill="none">
        <path
          d="M6 4.5C6 3.67157 6.67157 3 7.5 3H15.5L20 7.5V19.5C20 20.3284 19.3284 21 18.5 21H7.5C6.67157 21 6 20.3284 6 19.5V4.5Z"
          fill={softFill}
          stroke={strokeColor}
          strokeWidth="1.9"
          strokeLinejoin="round"
        />
        {isActive && (
          <path
            d="M6 4.5C6 3.67157 6.67157 3 7.5 3H12.5V21H7.5C6.67157 21 6 20.3284 6 19.5V4.5Z"
            fill={accentFill}
            fillOpacity="0.88"
          />
        )}
        <path
          d="M15 3V8H20"
          stroke={strokeColor}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M9.5 11.5H16.5M9.5 15H14.5"
          stroke={isActive ? '#ffffff' : strokeColor}
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        {isActive && (
          <>
            <line x1="5.5" y1="23.5" x2="11.5" y2="23.5" stroke="#1e3a8a" strokeWidth="1.9" strokeLinecap="round" />
            <line x1="14.5" y1="23.5" x2="17.5" y2="23.5" stroke="#4361ee" strokeWidth="1.9" strokeLinecap="round" />
          </>
        )}
      </svg>
    );
  }

  if (tab === 'announcements') {
    // Formal Official Bulletin / Civic Newspaper Icon
    return (
      <svg width="24" height="24" viewBox="0 0 26 26" fill="none">
        <rect
          x="4"
          y="4.5"
          width="15"
          height="16"
          rx="2.5"
          fill={softFill}
          stroke={strokeColor}
          strokeWidth="1.9"
        />
        {isActive && (
          <rect
            x="6.8"
            y="7.5"
            width="9.4"
            height="4.8"
            rx="1.2"
            fill={accentFill}
          />
        )}
        {!isActive && (
          <rect
            x="7"
            y="7.5"
            width="9"
            height="4.5"
            rx="1"
            stroke={strokeColor}
            strokeWidth="1.7"
          />
        )}
        <path
          d="M19 8.5H20.5C21.3284 8.5 22 9.17157 22 10V18.5C22 19.6046 21.1046 20.5 20 20.5H18"
          stroke={strokeColor}
          strokeWidth="1.9"
          strokeLinecap="round"
        />
        <path
          d="M7.5 15.5H15.5M7.5 18H12.5"
          stroke={strokeColor}
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        {isActive && (
          <>
            <line x1="5.5" y1="23.5" x2="11.5" y2="23.5" stroke="#1e3a8a" strokeWidth="1.9" strokeLinecap="round" />
            <line x1="14.5" y1="23.5" x2="17.5" y2="23.5" stroke="#4361ee" strokeWidth="1.9" strokeLinecap="round" />
          </>
        )}
      </svg>
    );
  }

  // Formal Citizen Profile Icon
  return (
    <svg width="24" height="24" viewBox="0 0 26 26" fill="none">
      <circle
        cx="13"
        cy="9.5"
        r="4.8"
        fill={isActive ? accentFill : 'none'}
        stroke={strokeColor}
        strokeWidth="1.9"
      />
      <path
        d="M5.5 20.5C6.6 16.9 9.5 15 13 15C16.5 15 19.4 16.9 20.5 20.5"
        fill={softFill}
        stroke={strokeColor}
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      {isActive && (
        <>
          <line x1="6.5" y1="23.5" x2="12.5" y2="23.5" stroke="#1e3a8a" strokeWidth="1.9" strokeLinecap="round" />
          <line x1="15.5" y1="23.5" x2="18.5" y2="23.5" stroke="#4361ee" strokeWidth="1.9" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

export default function BottomNav({
  activeTab,
  onTabChange,
  activeRequestsCount = 0,
}: BottomNavProps) {
  const [barWidth, setBarWidth] = useState<number>(360);

  // Subtle in-place scale animation when tapping an icon (never slides the bar notch)
  const scaleMap = useRef<Record<NavTab, Animated.Value>>({
    home: new Animated.Value(1),
    documents: new Animated.Value(1),
    requests: new Animated.Value(1),
    announcements: new Animated.Value(1),
    profile: new Animated.Value(1),
  }).current;

  useEffect(() => {
    ensureInterFontLoaded();
  }, []);

  useEffect(() => {
    const activeAnim = scaleMap[activeTab];
    if (!activeAnim) return;
    activeAnim.setValue(0.86);
    Animated.spring(activeAnim, {
      toValue: 1,
      friction: 5,
      tension: 160,
      useNativeDriver: false,
    }).start();
  }, [activeTab, scaleMap]);

  const handleBarLayout = (e: LayoutChangeEvent) => {
    const measuredWidth = e.nativeEvent.layout.width;
    if (measuredWidth > 0 && Math.abs(measuredWidth - barWidth) > 1) {
      setBarWidth(measuredWidth);
    }
  };

  const svgPath = buildCenterNotchedBarPath(barWidth, BAR_HEIGHT);
  const isCenterActive = activeTab === 'requests';

  return (
    <View style={styles.outerWrapper} pointerEvents="box-none">
      <View style={styles.dockContainer} onLayout={handleBarLayout}>
        {/* 1. Fixed Center-Notched White Pill Bar (Exact match to reference image) */}
        {Platform.OS === 'web' ? (
          <View style={styles.svgBackdropWrap} pointerEvents="none">
            <svg
              width={barWidth}
              height={BAR_HEIGHT}
              viewBox={`0 0 ${barWidth} ${BAR_HEIGHT}`}
              style={{
                overflow: 'visible',
                filter:
                  'drop-shadow(0px 14px 28px rgba(59, 91, 253, 0.10)) drop-shadow(0px 4px 10px rgba(15, 23, 42, 0.04))',
              }}
            >
              <path
                d={svgPath}
                fill="#ffffff"
                stroke="rgba(226, 232, 240, 0.65)"
                strokeWidth="1"
              />
            </svg>
          </View>
        ) : (
          <View style={styles.nativeFallbackBar} pointerEvents="none" />
        )}

        {/* 2. Fixed Center Floating Blue Circle Button inside the Concave Cradle */}
        <View
          style={[
            styles.centerOrbAnchor,
            { left: barWidth / 2 - ORB_SIZE / 2 },
          ]}
          pointerEvents="box-none"
        >
          {/* Soft Blue-Violet Glow Halo in the Cradle */}
          <View
            style={[
              styles.orbAmbientHalo,
              isCenterActive && styles.orbAmbientHaloActive,
            ]}
            pointerEvents="none"
          />

          <Animated.View style={{ transform: [{ scale: scaleMap.requests }] }}>
            <TouchableOpacity
              style={[
                styles.orbCircle,
                isCenterActive && styles.orbCircleActive,
              ]}
              onPress={() => onTabChange('requests')}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Requests"
            >
              <Plus
                size={25}
                color="#ffffff"
                strokeWidth={2.6}
                style={
                  isCenterActive
                    ? ({ transform: [{ rotate: '45deg' }] } as any)
                    : undefined
                }
              />

              {activeRequestsCount > 0 && (
                <View style={styles.orbBadge}>
                  <Text style={styles.reqBadgeText}>
                    {activeRequestsCount > 9 ? '9+' : activeRequestsCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* 3. Left 2 Formal Icons + Center Requests Label + Right 2 Formal Icons */}
        <View style={styles.tabsRow} pointerEvents="box-none">
          {/* Left Pair: Home & Documents */}
          <View style={styles.sideGroup}>
            <TouchableOpacity
              style={styles.tabButton}
              onPress={() => onTabChange('home')}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Home"
            >
              <Animated.View
                style={[
                  styles.iconWrap,
                  { transform: [{ scale: scaleMap.home }] },
                ]}
              >
                <FormalNavIcon tab="home" isActive={activeTab === 'home'} />
              </Animated.View>
              <Text
                style={[
                  styles.tabLabel,
                  activeTab === 'home' && styles.tabLabelActive,
                ]}
                numberOfLines={1}
              >
                Home
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.tabButton}
              onPress={() => onTabChange('documents')}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Documents"
            >
              <Animated.View
                style={[
                  styles.iconWrap,
                  { transform: [{ scale: scaleMap.documents }] },
                ]}
              >
                <FormalNavIcon tab="documents" isActive={activeTab === 'documents'} />
              </Animated.View>
              <Text
                style={[
                  styles.tabLabel,
                  activeTab === 'documents' && styles.tabLabelActive,
                ]}
                numberOfLines={1}
              >
                Documents
              </Text>
            </TouchableOpacity>
          </View>

          {/* Center Slot: Requests Label below the Floating Center Orb */}
          <TouchableOpacity
            style={styles.centerGap}
            onPress={() => onTabChange('requests')}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Requests"
          >
            <Text
              style={[
                styles.tabLabel,
                isCenterActive && styles.tabLabelActive,
              ]}
              numberOfLines={1}
            >
              Requests
            </Text>
          </TouchableOpacity>

          {/* Right Pair: Bulletins & Profile */}
          <View style={styles.sideGroup}>
            <TouchableOpacity
              style={styles.tabButton}
              onPress={() => onTabChange('announcements')}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Bulletins"
            >
              <Animated.View
                style={[
                  styles.iconWrap,
                  { transform: [{ scale: scaleMap.announcements }] },
                ]}
              >
                <FormalNavIcon
                  tab="announcements"
                  isActive={activeTab === 'announcements'}
                />
              </Animated.View>
              <Text
                style={[
                  styles.tabLabel,
                  activeTab === 'announcements' && styles.tabLabelActive,
                ]}
                numberOfLines={1}
              >
                Bulletins
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.tabButton}
              onPress={() => onTabChange('profile')}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Profile"
            >
              <Animated.View
                style={[
                  styles.iconWrap,
                  { transform: [{ scale: scaleMap.profile }] },
                ]}
              >
                <FormalNavIcon tab="profile" isActive={activeTab === 'profile'} />
              </Animated.View>
              <Text
                style={[
                  styles.tabLabel,
                  activeTab === 'profile' && styles.tabLabelActive,
                ]}
                numberOfLines={1}
              >
                Profile
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 18 : 12,
    paddingTop: 28,
    alignItems: 'center',
    justifyContent: 'flex-end',
    zIndex: 50,
  },
  dockContainer: {
    width: '100%',
    maxWidth: 460,
    height: BAR_HEIGHT,
    position: 'relative',
    justifyContent: 'center',
  },
  svgBackdropWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  nativeFallbackBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    shadowColor: '#3b5bfd',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 22,
    elevation: 10,
  },
  centerOrbAnchor: {
    position: 'absolute',
    top: -24,
    width: ORB_SIZE,
    height: ORB_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 35,
  },
  orbAmbientHalo: {
    position: 'absolute',
    top: 6,
    width: ORB_SIZE + 12,
    height: ORB_SIZE + 12,
    borderRadius: (ORB_SIZE + 12) / 2,
    backgroundColor: 'rgba(79, 107, 254, 0.25)',
    ...(Platform.OS === 'web'
      ? ({
          filter: 'blur(11px)',
        } as any)
      : {}),
  },
  orbAmbientHaloActive: {
    backgroundColor: 'rgba(59, 91, 253, 0.38)',
  },
  orbCircle: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    backgroundColor: '#4361ee',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3b5bfd',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
    ...(Platform.OS === 'web'
      ? ({
          backgroundImage:
            'linear-gradient(145deg, #5e78ff 0%, #435ff8 52%, #314ce6 100%)',
          boxShadow:
            '0 10px 22px rgba(67, 95, 248, 0.38), inset 0 2px 4px rgba(255, 255, 255, 0.32)',
          cursor: 'pointer',
        } as any)
      : {}),
  },
  orbCircleActive: {
    ...(Platform.OS === 'web'
      ? ({
          backgroundImage:
            'linear-gradient(145deg, #435ff8 0%, #2541e5 55%, #1d35b8 100%)',
          boxShadow:
            '0 12px 26px rgba(37, 65, 229, 0.52), 0 0 0 3px rgba(94, 120, 255, 0.28), inset 0 2px 4px rgba(255, 255, 255, 0.38)',
        } as any)
      : {}),
  },
  orbBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  reqBadgeText: {
    fontFamily: 'Inter',
    fontSize: 9,
    fontWeight: '800',
    color: '#ffffff',
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: BAR_HEIGHT,
    paddingHorizontal: 10,
    zIndex: 20,
  },
  sideGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: BAR_HEIGHT,
  },
  centerGap: {
    width: NOTCH_HALF_WIDTH * 2 + 4,
    height: BAR_HEIGHT,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 10,
    ...(Platform.OS === 'web'
      ? ({
          cursor: 'pointer',
          userSelect: 'none',
        } as any)
      : {}),
  },
  tabButton: {
    flex: 1,
    height: BAR_HEIGHT,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 10,
    borderRadius: 16,
    ...(Platform.OS === 'web'
      ? ({
          cursor: 'pointer',
          userSelect: 'none',
        } as any)
      : {}),
  },
  iconWrap: {
    marginBottom: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontFamily: 'Inter',
    fontSize: 10,
    fontWeight: '600',
    color: '#7c8594',
    letterSpacing: 0.15,
  },
  tabLabelActive: {
    color: '#1e3a8a',
    fontWeight: '800',
  },
});
