import { Text, Anchor, Center, Stack, Button } from "@mantine/core";

export default function GitHubView(){
    return(
        <>
        
        <Stack>
            <Text align="center" size={15} mt={20}>
                SynBioSuite GitHub and our Research Group's Website
            </Text>

            <Center style={{justifyContent: "space-evenly"}}>
                <Button
                    component="a"
                    align="center"
                    href="https://github.com/MyersResearchGroup/SynBioSuite"
                    target="_blank"
                    size = 'xs'
                    
                >
                    SynBioSuite
                </Button>
                <Button
                    component="a"
                    align="center"
                    href="https://geneticlogiclab.org/"
                    target="_blank"
                    size = 'xs'
                >
                    Genetic Logic Lab
                </Button>
                
            </Center>
            
        </Stack>
    </>
    )
}