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
                label="Create a Flapjack study?"
                value={choice}
                onChange={setChoice}
            >
                <Radio
                    value="none"
                    label="No (SynBioHub only)"
                />

                <Radio
                    value="existing"
                    label="Yes, use an existing Flapjack instance"
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