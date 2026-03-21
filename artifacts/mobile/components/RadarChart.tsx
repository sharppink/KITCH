import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Polygon, Circle, Line, Text as SvgText, G } from 'react-native-svg';
import Colors from '@/constants/colors';

const CRITERIA_LABELS = ['출처\n권위도', '시점\n유효성', '논리적\n완결성', '이해관계\n투명성', '데이터\n구체성', '교차\n검증'];
const THRESHOLD = 40;
const SIZE = 220;
const CX = SIZE / 2;
const CY = SIZE / 2;
const MAX_R = 72;
const LABEL_R = MAX_R + 22;
const ANGLES = Array.from({ length: 6 }, (_, i) => ((-90 + i * 60) * Math.PI) / 180);

function polarPoint(r: number, angle: number): { x: number; y: number } {
  return { x: CX + r * Math.cos(angle), y: CY + r * Math.sin(angle) };
}

function toPolygonPoints(scores: number[]): string {
  return scores
    .map((s, i) => {
      const r = (Math.max(0, Math.min(100, s)) / 100) * MAX_R;
      const p = polarPoint(r, ANGLES[i]);
      return `${p.x},${p.y}`;
    })
    .join(' ');
}

function toGridPoints(fraction: number): string {
  return ANGLES.map((a) => {
    const p = polarPoint(fraction * MAX_R, a);
    return `${p.x},${p.y}`;
  }).join(' ');
}

interface Props {
  scores: number[];
}

export function RadarChart({ scores }: Props) {
  const normalized = scores.length === 6 ? scores : Array(6).fill(50);
  const belowThreshold = normalized.filter((s) => s < THRESHOLD).length;
  const isUnreliable = belowThreshold >= 4;

  return (
    <View style={styles.container}>
      <Svg width={SIZE} height={SIZE}>
        {/* 배경 그리드 */}
        {[0.2, 0.4, 0.6, 0.8, 1.0].map((frac) => (
          <Polygon
            key={frac}
            points={toGridPoints(frac)}
            fill="none"
            stroke={frac === THRESHOLD / 100 ? '#F5E642' : Colors.border}
            strokeWidth={frac === THRESHOLD / 100 ? 1.5 : 0.8}
            opacity={frac === THRESHOLD / 100 ? 0.9 : 0.6}
          />
        ))}

        {/* 40점 기준선 채우기 (연한 노란색) */}
        <Polygon
          points={toGridPoints(THRESHOLD / 100)}
          fill="rgba(255, 240, 80, 0.13)"
          stroke="#F5E642"
          strokeWidth={1.5}
          strokeDasharray="3,2"
        />

        {/* 축 라인 */}
        {ANGLES.map((angle, i) => {
          const p = polarPoint(MAX_R, angle);
          return (
            <Line
              key={i}
              x1={CX}
              y1={CY}
              x2={p.x}
              y2={p.y}
              stroke={Colors.border}
              strokeWidth={0.8}
              opacity={0.7}
            />
          );
        })}

        {/* 데이터 폴리곤 */}
        <Polygon
          points={toPolygonPoints(normalized)}
          fill={isUnreliable ? 'rgba(226,44,41,0.15)' : 'rgba(91,53,181,0.18)'}
          stroke={isUnreliable ? '#E22C29' : Colors.primary}
          strokeWidth={2}
        />

        {/* 데이터 포인트 */}
        {normalized.map((s, i) => {
          const r = (Math.max(0, Math.min(100, s)) / 100) * MAX_R;
          const p = polarPoint(r, ANGLES[i]);
          const below = s < THRESHOLD;
          return (
            <Circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={4}
              fill={below ? '#E22C29' : Colors.primary}
              stroke="#fff"
              strokeWidth={1.5}
            />
          );
        })}

        {/* 축 레이블 */}
        {CRITERIA_LABELS.map((label, i) => {
          const p = polarPoint(LABEL_R, ANGLES[i]);
          const below = normalized[i] < THRESHOLD;
          const lines = label.split('\n');
          const lineH = 11;
          const totalH = lines.length * lineH;
          return (
            <G key={i}>
              {lines.map((line, li) => (
                <SvgText
                  key={li}
                  x={p.x}
                  y={p.y - totalH / 2 + li * lineH + 9}
                  textAnchor="middle"
                  fontSize={9.5}
                  fontFamily="System"
                  fill={below ? '#E22C29' : Colors.textSecondary}
                  fontWeight={below ? '700' : '500'}
                >
                  {line}
                </SvgText>
              ))}
            </G>
          );
        })}

        {/* 점수 텍스트 */}
        {normalized.map((s, i) => {
          const r = (Math.max(0, Math.min(100, s)) / 100) * MAX_R;
          const mid = polarPoint(r * 0.62 + MAX_R * 0.06, ANGLES[i]);
          return (
            <SvgText
              key={i}
              x={mid.x}
              y={mid.y + 4}
              textAnchor="middle"
              fontSize={8.5}
              fontFamily="System"
              fill={s < THRESHOLD ? '#E22C29' : Colors.primary}
              fontWeight="700"
              opacity={0.85}
            >
              {s}
            </SvgText>
          );
        })}

        {/* 중앙 점 */}
        <Circle cx={CX} cy={CY} r={3} fill={Colors.border} />
      </Svg>

      {/* 범례 */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: 'rgba(255,240,80,0.4)', borderColor: '#F5E642', borderWidth: 1 }]} />
          <Text style={styles.legendText}>기준치 (40점)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: isUnreliable ? 'rgba(226,44,41,0.2)' : 'rgba(91,53,181,0.2)', borderColor: isUnreliable ? '#E22C29' : Colors.primary, borderWidth: 1 }]} />
          <Text style={styles.legendText}>내 콘텐츠</Text>
        </View>
      </View>

      {/* 미달 경고 문구 */}
      {isUnreliable && (
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            6개 신뢰 지표 중 {belowThreshold}개 항목에서 기준치(40점) 미달이 확인되어, 신뢰 불가로 의사결정에 주의하시기 바랍니다.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingTop: 8,
    gap: 8,
  },
  legend: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 11,
    color: Colors.textTertiary,
    fontFamily: 'System',
  },
  warningBox: {
    backgroundColor: 'rgba(226,44,41,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(226,44,41,0.3)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 2,
    width: '100%',
  },
  warningText: {
    fontSize: 12,
    color: '#C00',
    lineHeight: 18,
    textAlign: 'center',
    fontFamily: 'System',
  },
});
