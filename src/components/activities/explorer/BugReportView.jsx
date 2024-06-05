import { Text, Anchor, Center, Stack, Button } from "@mantine/core";
export default function BugReportView() {
    return (
        <>
            <Stack>
                <Text align="center" size={15} mt={20}>
                    File a Bug Report via our GitHub Issues Tracker
                </Text>

                <Center>

                <Button
                    component="a"
                    align="center"
                    href="https://github.com/MyersResearchGroup/SynBioSuite/issues"
                    target="_blank"
                >
                    GitHub Issues
                </Button>
                </Center>
            </Stack>
        </>
    );
}
