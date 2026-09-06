// =============================================================
// INDUSTRIAL CONVEYOR / PROCESS CONTROL
// =============================================================
//
// Main characteristics:
//
// - All workpieces are driven by ONE common belt displacement.
// - Relative spacing between boxes can therefore never drift.
// - Workpieces wrap around the conveyor while preserving spacing.
// - A workpiece stops exactly at the processing station.
// - The actuator lowers, processes the box and raises again.
// - Processed boxes turn green.
// - When a box wraps back to the beginning, it becomes orange.
// - START / STOP / E-STOP / RESET remain functional.
//
// =============================================================


// =============================================================
// INDUSTRIAL CYCLE
// =============================================================

AFRAME.registerComponent(
    'industrial-cycle',
    {

        // =====================================================
        // SCHEMA
        // =====================================================

        schema: {

            speed: {
                type: 'number',
                default: 0.6
            },

            minX: {
                type: 'number',
                default: -2.4
            },

            maxX: {
                type: 'number',
                default: 2.4
            },

            stationX: {
                type: 'number',
                default: 0
            },

            lowerDistance: {
                type: 'number',
                default: 0.28
            },

            lowerDuration: {
                type: 'number',
                default: 700
            },

            processingDuration: {
                type: 'number',
                default: 1100
            },

            raiseDuration: {
                type: 'number',
                default: 700
            }

        },


        // =====================================================
        // INITIALIZATION
        // =====================================================

        init: function () {

            // -------------------------------------------------
            // WORKPIECES
            // -------------------------------------------------

            this.workpieces =
                Array.from(
                    this.el.querySelectorAll(
                        '.workpiece'
                    )
                );


            // Store the INITIAL X position of every workpiece.
            //
            // These offsets never change.
            //
            // All future movement is calculated from:
            //
            // initialPosition + commonBeltDistance

            this.workpieceData =
                this.workpieces.map(
                    (workpiece) => {

                        return {

                            el:
                                workpiece,

                            initialX:
                                workpiece
                                    .object3D
                                    .position
                                    .x,

                            previousX:
                                workpiece
                                    .object3D
                                    .position
                                    .x,

                            processed:
                                false

                        };

                    }
                );


            // -------------------------------------------------
            // MASTER BELT POSITION
            // -------------------------------------------------

            this.beltDistance =
                0;


            // -------------------------------------------------
            // PROCESSING EQUIPMENT
            // -------------------------------------------------

            this.actuator =
                document.querySelector(
                    '#processing-actuator'
                );


            this.tool =
                document.querySelector(
                    '#processing-tool'
                );


            if (
                this.actuator
            ) {

                this.actuatorBaseY =
                    this.actuator
                        .object3D
                        .position
                        .y;

            }


            if (
                this.tool
            ) {

                this.toolBaseY =
                    this.tool
                        .object3D
                        .position
                        .y;

            }


            // -------------------------------------------------
            // CURRENT PROCESSING BOX
            // -------------------------------------------------

            this.currentWorkpiece =
                null;


            // -------------------------------------------------
            // PROCESS STATE
            // -------------------------------------------------
            //
            // idle
            // lowering
            // processing
            // raising
            // -------------------------------------------------

            this.processState =
                'idle';


            this.processElapsed =
                0;


            // -------------------------------------------------
            // SYSTEM STATE
            // -------------------------------------------------

            this.running =
                true;


            this.emergency =
                false;


            // -------------------------------------------------
            // COLORS
            // -------------------------------------------------

            this.unprocessedColor =
                '#FF8C42';


            this.processedColor =
                '#2E8B3C';


            // -------------------------------------------------
            // STATUS LIGHTS
            // -------------------------------------------------

            this.greenLight =
                document.querySelector(
                    '#panel-green'
                );


            this.yellowLight =
                document.querySelector(
                    '#panel-yellow'
                );


            this.redLight =
                document.querySelector(
                    '#panel-red'
                );


            // -------------------------------------------------
            // INITIALIZE DISPLAY
            // -------------------------------------------------

            this.updateAllWorkpieces();

            this.updateStatusLights();

        },


        // =====================================================
        // WRAP POSITION
        // =====================================================

        wrapX: function (
            x
        ) {

            const minX =
                this.data.minX;


            const maxX =
                this.data.maxX;


            const range =
                maxX - minX;


            // Proper modulo operation that also works
            // with negative numbers.

            return (
                (
                    (
                        x - minX
                    )
                    %
                    range
                )
                +
                range
            )
            %
            range
            +
            minX;

        },


        // =====================================================
        // UPDATE ALL BOX POSITIONS
        // =====================================================

        updateAllWorkpieces: function () {

            this.workpieceData.forEach(
                (data) => {

                    const rawX =
                        data.initialX
                        +
                        this.beltDistance;


                    const newX =
                        this.wrapX(
                            rawX
                        );


                    // -------------------------------------------------
                    // DETECT WRAP
                    // -------------------------------------------------
                    //
                    // The conveyor travels toward +X.
                    //
                    // If previous X was near maxX and the new X
                    // suddenly appears near minX, this workpiece
                    // completed one conveyor lap.
                    // -------------------------------------------------

                    if (
                        data.previousX >
                        newX + 1.0
                    ) {

                        data.processed =
                            false;


                        data.el.setAttribute(
                            'color',
                            this.unprocessedColor
                        );

                    }


                    data.el
                        .object3D
                        .position
                        .x =
                            newX;


                    data.previousX =
                        newX;

                }
            );

        },


        // =====================================================
        // CHECK FOR PROCESSING STATION
        // =====================================================

        checkProcessingStation: function () {

            if (
                this.processState !==
                'idle'
            ) {

                return;

            }


            const stationX =
                this.data.stationX;


            // Search for an UNPROCESSED box that has just
            // crossed the processing station.

            for (
                let i = 0;
                i <
                this.workpieceData.length;
                i++
            ) {

                const data =
                    this.workpieceData[i];


                if (
                    data.processed
                ) {

                    continue;

                }


                const currentX =
                    data.el
                        .object3D
                        .position
                        .x;


                // Allow a small detection window.

                const detectionTolerance =
                    0.025;


                if (
                    currentX >=
                        stationX
                    &&
                    currentX <=
                        stationX
                        +
                        detectionTolerance
                ) {

                    // Place the box EXACTLY at station X.

                    const correction =
                        currentX
                        -
                        stationX;


                    this.beltDistance -=
                        correction;


                    this.updateAllWorkpieces();


                    data.el
                        .object3D
                        .position
                        .x =
                            stationX;


                    this.startProcessing(
                        data
                    );


                    break;

                }

            }

        },


        // =====================================================
        // BEGIN PROCESS
        // =====================================================

        startProcessing: function (
            data
        ) {

            if (
                this.processState !==
                'idle'
            ) {

                return;

            }


            this.currentWorkpiece =
                data;


            this.processState =
                'lowering';


            this.processElapsed =
                0;

        },


        // =====================================================
        // PROCESSING STATE MACHINE
        // =====================================================

        updateProcessing: function (
            dt
        ) {

            if (
                this.processState ===
                'idle'
            ) {

                return;

            }


            this.processElapsed +=
                dt;


            // =================================================
            // LOWER ACTUATOR
            // =================================================

            if (
                this.processState ===
                'lowering'
            ) {

                const progress =
                    Math.min(
                        this.processElapsed
                        /
                        this.data
                            .lowerDuration,
                        1
                    );


                const displacement =
                    this.data
                        .lowerDistance
                    *
                    progress;


                this.setActuatorDisplacement(
                    displacement
                );


                if (
                    progress >= 1
                ) {

                    this.processState =
                        'processing';


                    this.processElapsed =
                        0;


                    // Box becomes processed.

                    if (
                        this.currentWorkpiece
                    ) {

                        this.currentWorkpiece
                            .processed =
                                true;


                        this.currentWorkpiece
                            .el
                            .setAttribute(
                                'color',
                                this.processedColor
                            );

                    }

                }


                return;

            }


            // =================================================
            // PROCESSING WAIT
            // =================================================

            if (
                this.processState ===
                'processing'
            ) {

                if (
                    this.processElapsed >=
                    this.data
                        .processingDuration
                ) {

                    this.processState =
                        'raising';


                    this.processElapsed =
                        0;

                }


                return;

            }


            // =================================================
            // RAISE ACTUATOR
            // =================================================

            if (
                this.processState ===
                'raising'
            ) {

                const progress =
                    Math.min(
                        this.processElapsed
                        /
                        this.data
                            .raiseDuration,
                        1
                    );


                const displacement =
                    this.data
                        .lowerDistance
                    *
                    (
                        1 - progress
                    );


                this.setActuatorDisplacement(
                    displacement
                );


                if (
                    progress >= 1
                ) {

                    this.setActuatorDisplacement(
                        0
                    );


                    this.processState =
                        'idle';


                    this.processElapsed =
                        0;


                    this.currentWorkpiece =
                        null;

                }

            }

        },


        // =====================================================
        // ACTUATOR POSITION
        // =====================================================

        setActuatorDisplacement:
        function (
            displacement
        ) {

            if (
                this.actuator
            ) {

                this.actuator
                    .object3D
                    .position
                    .y =
                        this.actuatorBaseY
                        -
                        displacement;

            }


            if (
                this.tool
            ) {

                this.tool
                    .object3D
                    .position
                    .y =
                        this.toolBaseY
                        -
                        displacement;

            }

        },


        // =====================================================
        // START
        // =====================================================

        startSystem: function () {

            if (
                this.emergency
            ) {

                return;

            }


            this.running =
                true;


            this.updateStatusLights();

        },


        // =====================================================
        // STOP
        // =====================================================

        stopSystem: function () {

            if (
                this.emergency
            ) {

                return;

            }


            this.running =
                false;


            this.updateStatusLights();

        },


        // =====================================================
        // EMERGENCY STOP
        // =====================================================

        emergencyStop: function () {

            this.running =
                false;


            this.emergency =
                true;


            this.updateStatusLights();

        },


        // =====================================================
        // RESET
        // =====================================================

        resetSystem: function () {

            // Clear emergency condition.

            this.emergency =
                false;


            // Stay stopped after reset.
            // START is required to resume operation.

            this.running =
                false;


            // Cancel any active processing operation.

            this.processState =
                'idle';


            this.processElapsed =
                0;


            this.currentWorkpiece =
                null;


            // Return actuator to home position.

            this.setActuatorDisplacement(
                0
            );


            this.updateStatusLights();

        },


        // =====================================================
        // STATUS LIGHTS
        // =====================================================

        updateStatusLights: function () {

            let green =
                0;


            let yellow =
                0;


            let red =
                0;


            if (
                this.emergency
            ) {

                red =
                    1.5;

            }

            else if (
                this.running
            ) {

                green =
                    1.5;

            }

            else {

                yellow =
                    1.5;

            }


            this.setLightIntensity(
                this.greenLight,
                green
            );


            this.setLightIntensity(
                this.yellowLight,
                yellow
            );


            this.setLightIntensity(
                this.redLight,
                red
            );

        },


        // =====================================================
        // LIGHT EMISSIVE INTENSITY
        // =====================================================

        setLightIntensity: function (
            light,
            intensity
        ) {

            if (
                !light
            ) {

                return;

            }


            light.setAttribute(
                'material',
                'emissiveIntensity',
                intensity
            );

        },


        // =====================================================
        // MAIN FRAME UPDATE
        // =====================================================

        tick: function (
            time,
            dt
        ) {

            if (
                !dt
                ||
                dt >
                200
            ) {

                return;

            }


            // =================================================
            // PROCESSING STATE
            // =================================================
            //
            // The belt remains stopped while the actuator
            // performs its operation.
            // =================================================

            if (
                this.processState !==
                'idle'
            ) {

                this.updateProcessing(
                    dt
                );


                return;

            }


            // =================================================
            // STOPPED / EMERGENCY
            // =================================================

            if (
                !this.running
                ||
                this.emergency
            ) {

                return;

            }


            // =================================================
            // MASTER BELT MOVEMENT
            // =================================================

            const distance =
                this.data.speed
                *
                (
                    dt / 1000
                );


            // EVERY box receives this exact same displacement.

            this.beltDistance +=
                distance;


            this.updateAllWorkpieces();


            // =================================================
            // PROCESS STATION DETECTION
            // =================================================

            this.checkProcessingStation();

        }

    }
);



// =============================================================
// CONTROL BUTTON
// =============================================================

AFRAME.registerComponent(
    'control-button',
    {

        // =====================================================
        // SCHEMA
        // =====================================================

        schema: {

            action: {
                type: 'string',
                default: ''
            }

        },


        // =====================================================
        // INIT
        // =====================================================

        init: function () {

            this.el.addEventListener(
                'click',
                () => {

                    const industrialCell =
                        document.querySelector(
                            '#industrial-cell'
                        );


                    if (
                        !industrialCell
                    ) {

                        return;

                    }


                    const controller =
                        industrialCell
                            .components[
                                'industrial-cycle'
                            ];


                    if (
                        !controller
                    ) {

                        return;

                    }


                    const action =
                        this.data.action
                            .toLowerCase();


                    switch (
                        action
                    ) {

                        case 'start':

                            controller
                                .startSystem();

                            break;


                        case 'stop':

                            controller
                                .stopSystem();

                            break;


                        case 'emergency':

                            controller
                                .emergencyStop();

                            break;


                        case 'reset':

                            controller
                                .resetSystem();

                            break;


                        default:

                            console.warn(
                                'Unknown control action:',
                                action
                            );

                    }

                }
            );

        }

    }
);