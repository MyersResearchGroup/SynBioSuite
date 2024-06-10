import { Text, Anchor, Center, Stack, Button } from "@mantine/core";

export default function GitHubView(){
    return(
        <>
        
        <Stack>
            <Text align="center" size={15} mt={20}>
                GitHub links to our various Projects!
            </Text>

            <Center>
                <Button
                    component="a"
                    align="center"
                    href="https://github.com/MyersResearchGroup/SynBioSuite"
                    target="_blank"
                    style={{width: "115.5px"}}

                >
                    SynBioSuite
                </Button>
                
            </Center>
            <Center>
                <Button
                    component="a"
                    align="center"
                    href="https://github.com/SynBioDex/SBOLCanvas"
                    target="_blank"
                    style={{width: "115.5px"}}
                >
                    SBOLCanvas
                </Button>
            </Center>
            <Center>
                <Button
                    component="a"
                    align="center"
                    href="https://github.com/SynBioHub/synbiohub"
                    target="_blank"
                    style={{width: "115.5px"}}
                >
                    SynBioHub
                </Button>
            </Center>
        </Stack>
    </>
    )
}