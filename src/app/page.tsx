import { Page, PageHeader, PageTitle, PageBody } from '@blinkdotnew/ui'

export default function Home() {
  return (
    <Page>
      <PageHeader>
        <PageTitle>Blink Next.js</PageTitle>
      </PageHeader>
      <PageBody>
        <p className="text-sm text-muted-foreground">
          Start building — describe what you want and Blink will edit this app.
        </p>
      </PageBody>
    </Page>
  )
}
