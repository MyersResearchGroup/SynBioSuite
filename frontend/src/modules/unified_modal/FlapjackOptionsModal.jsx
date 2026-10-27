import { Button, Group, Radio } from "@mantine/core";
import { useState } from "react";
import { MODAL_TYPES } from './unifiedModal';


export default function FlapjackOptionsModal({
    navigateTo,
    completeWorkflow,
    modalData,
}) {

    const [choice, setChoice] = useState("none");

    return (
        <>
            <Radio.Group
                label="Where should the plate reader measurements go?"
                value={choice}
                onChange={setChoice}
            >
                <Radio
                    value="none"
                    label="Nowhere else (SynBioHub only)"
                />

                <Radio
                    value="existing"
                    label="A Flapjack study, on an existing Flapjack instance"
                />

                <Radio
                    value="bob"
                    label="A BOB study, on a BOB server"
                />
            </Radio.Group>

            <Group mt="xl" position="right">

                <Button
                    onClick={() => {

                        if (choice === "none") {

                            navigateTo(
                                MODAL_TYPES.CREATE_COLLECTION,
                                {
                                    createFlapjackStudy: false,
                                }
                            );

                        } else if (choice === "bob") {

                            navigateTo(
                                MODAL_TYPES.BOB_INSTANCE_SELECTOR,
                                {
                                    createBOBStudy: true,
                                }
                            );

                        } else {

                            navigateTo(
                                MODAL_TYPES.FJ_INSTANCE_SELECTOR,
                                {
                                    createFlapjackStudy: true,
                                }
                            );

                        }

                    }}
                >
                    Continue
                </Button>

            </Group>

        </>
    );
}