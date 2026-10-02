import Link from "next/link"

export default function AutomationsPage() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Automations</h2>
        <div className="flex items-center space-x-2">
          <Link 
            href="/dashboard/automations/new/builder"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-blue-600 text-white hover:bg-blue-600/90 h-10 px-4 py-2"
          >
            Create Automation
          </Link>
        </div>
      </div>
      
      <div className="border rounded-lg bg-white overflow-hidden">
        <div className="p-4 border-b">
          <p className="font-medium">Welcome flow</p>
          <p className="text-sm text-gray-500">Triggers on keyword "GUIDE"</p>
        </div>
        <div className="p-4 border-b">
          <p className="font-medium">Lead generation</p>
          <p className="text-sm text-gray-500">Triggers on keyword "WEBINAR"</p>
        </div>
      </div>
    </div>
  )
}
