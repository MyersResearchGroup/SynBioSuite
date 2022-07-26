import Activities from './components/activities/Activities'
import Panels from './components/panels/Panels'
import { NotificationsProvider } from "@mantine/notifications"

export default function App() {
    return (
        <NotificationsProvider autoClose={5000} limit={8}>
            <Activities />
            <Panels />
        </NotificationsProvider>
    )
}