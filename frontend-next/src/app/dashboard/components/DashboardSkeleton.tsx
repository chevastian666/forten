import styled from '@emotion/styled';
import { theme } from '@/styles/theme';

const Container = styled.div`
  min-height: screen;
  background: ${theme.colors.gray[50]};
  
  .dark & {
    background: ${theme.colors.gray[900]};
  }
`;

const Header = styled.div`
  background: ${theme.colors.white};
  box-shadow: ${theme.shadows.sm};
  
  .dark & {
    background: ${theme.colors.gray[800]};
  }
`;

const HeaderContent = styled.div`
  max-width: 1280px;
  margin: 0 auto;
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  
  @media (min-width: 640px) {
    padding: ${theme.spacing.md} ${theme.spacing.xl};
  }
  
  @media (min-width: 1024px) {
    padding: ${theme.spacing.md} ${theme.spacing['2xl']};
  }
`;

const Main = styled.main`
  max-width: 1280px;
  margin: 0 auto;
  padding: ${theme.spacing.lg};
  
  @media (min-width: 640px) {
    padding: ${theme.spacing.lg} ${theme.spacing.xl};
  }
  
  @media (min-width: 1024px) {
    padding: ${theme.spacing.lg} ${theme.spacing['2xl']};
  }
`;

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${theme.spacing.xl};
  margin-bottom: ${theme.spacing['2xl']};
  
  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
  
  @media (min-width: 1024px) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

const MainGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${theme.spacing['2xl']};
  
  @media (min-width: 1024px) {
    grid-template-columns: 2fr 1fr;
  }
`;

const LeftColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing['2xl']};
`;

const RightColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing['2xl']};
`;

const SkeletonBox = styled.div<{ height?: string; width?: string }>`
  background: ${theme.colors.gray[200]};
  border-radius: ${theme.borderRadius.lg};
  animate: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  height: ${props => props.height || '200px'};
  width: ${props => props.width || '100%'};
  
  .dark & {
    background: ${theme.colors.gray[700]};
  }
  
  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }
`;

const MetricCard = styled.div`
  background: ${theme.colors.white};
  border-radius: ${theme.borderRadius.xl};
  box-shadow: ${theme.shadows.sm};
  border: 1px solid ${theme.colors.gray[200]};
  padding: ${theme.spacing.xl};
  
  .dark & {
    background: ${theme.colors.gray[800]};
    border-color: ${theme.colors.gray[700]};
  }
`;

const Section = styled.section`
  .section-title {
    font-size: ${theme.typography.fontSize.xl};
    font-weight: ${theme.typography.fontWeight.semibold};
    color: ${theme.colors.gray[900]};
    margin-bottom: ${theme.spacing.md};
    
    .dark & {
      color: ${theme.colors.white};
    }
  }
`;

const CameraGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${theme.spacing.md};
  
  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

export function DashboardSkeleton() {
  return (
    <Container>
      <Header>
        <HeaderContent>
          <SkeletonBox height="36px" width="200px" />
        </HeaderContent>
      </Header>

      <Main>
        {/* Metrics Row Skeleton */}
        <MetricsGrid>
          {[1, 2, 3, 4].map(index => (
            <MetricCard key={index}>
              <div className="flex items-center justify-between mb-4">
                <SkeletonBox height="32px" width="32px" />
                <SkeletonBox height="16px" width="40px" />
              </div>
              <SkeletonBox height="14px" width="80px" />
              <div style={{ marginTop: theme.spacing.xs }}>
                <SkeletonBox height="28px" width="60px" />
              </div>
            </MetricCard>
          ))}
        </MetricsGrid>

        {/* Main Grid Skeleton */}
        <MainGrid>
          {/* Left Column */}
          <LeftColumn>
            {/* Camera Grid Section */}
            <Section>
              <SkeletonBox height="24px" width="150px" />
              <div style={{ marginTop: theme.spacing.md }}>
                <CameraGrid>
                  {[1, 2, 3, 4].map(index => (
                    <SkeletonBox 
                      key={index} 
                      height="200px" 
                      style={{ aspectRatio: '16/9' }}
                    />
                  ))}
                </CameraGrid>
              </div>
            </Section>

            {/* Access Activity Section */}
            <Section>
              <SkeletonBox height="24px" width="180px" />
              <div style={{ marginTop: theme.spacing.md }}>
                <SkeletonBox height="400px" />
              </div>
            </Section>
          </LeftColumn>

          {/* Right Column */}
          <RightColumn>
            {/* Real-time Alerts Section */}
            <Section>
              <SkeletonBox height="24px" width="200px" />
              <div style={{ marginTop: theme.spacing.md, display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
                {[1, 2, 3].map(index => (
                  <SkeletonBox key={index} height="120px" />
                ))}
              </div>
            </Section>

            {/* Building Status Section */}
            <Section>
              <SkeletonBox height="24px" width="160px" />
              <div style={{ marginTop: theme.spacing.md }}>
                <SkeletonBox height="300px" />
              </div>
            </Section>

            {/* Quick Actions Section */}
            <Section>
              <SkeletonBox height="24px" width="140px" />
              <div style={{ marginTop: theme.spacing.md }}>
                <SkeletonBox height="250px" />
              </div>
            </Section>
          </RightColumn>
        </MainGrid>
      </Main>
    </Container>
  );
}