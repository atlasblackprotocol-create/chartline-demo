import SwiftUI

@main
struct ChartLineApp: App {
    @State private var store = AppStore()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(store)
                .tint(.brand)
                .preferredColorScheme(.dark)
        }
    }
}

struct RootView: View {
    // `-tab employer` on launch opens a specific tab (handy for demos and screenshots).
    @State private var tab = Tab(rawValue: UserDefaults.standard.string(forKey: "tab") ?? "") ?? .overview

    enum Tab: String { case overview, records, consent, care, employer }

    var body: some View {
        TabView(selection: $tab) {
            OverviewView(tab: $tab)
                .tabItem { Label("Overview", systemImage: "waveform.path.ecg") }
                .tag(Tab.overview)
            RecordsView()
                .tabItem { Label("Records", systemImage: "folder.badge.person.crop") }
                .tag(Tab.records)
            ConsentView()
                .tabItem { Label("Consent", systemImage: "lock.shield") }
                .tag(Tab.consent)
            CareView()
                .tabItem { Label("Care", systemImage: "calendar.badge.clock") }
                .tag(Tab.care)
            EmployerDashboardView()
                .tabItem { Label("Employer", systemImage: "building.2") }
                .tag(Tab.employer)
        }
    }
}
