import {
  DataInsightsSection,
  FaqSection,
  FeatureHighlightsSection,
  HeroSection,
  HomeFooter,
  HomeHeader,
  PricingSection,
  RoleWorkspacesSection,
  WarehouseFlowSection,
} from '../components/HomePage'

export function HomePage() {
  return (
    <div className="theme-home bg-background text-foreground flex min-h-dvh flex-col">
      <HomeHeader />
      <main className="flex-1">
        <HeroSection />
        <WarehouseFlowSection />
        <FeatureHighlightsSection />
        <RoleWorkspacesSection />
        <DataInsightsSection />
        <PricingSection />
        <FaqSection />
      </main>
      <HomeFooter />
    </div>
  )
}
