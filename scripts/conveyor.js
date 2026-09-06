// =============================================================
// CONTROL BUTTON COMPONENT
// =============================================================

AFRAME.registerComponent(
    'control-button',
    {

        schema: {

            action: {
                type: 'string',
                default: ''
            }

        },


        init: function () {

            this.el.addEventListener(
                'click',
                () => {

                    const industrialCell =
                        document.querySelector(
                            '#industrial-cell'
                        );


                    if (!industrialCell) {
                        return;
                    }


                    const cycle =
                        industrialCell.components[
                            'industrial-cycle'
                        ];


                    if (!cycle) {
                        return;
                    }


                    cycle.handleControlAction(
                        this.data.action
                    );

                }
            );

        }

    }
);



// =============================================================
// INDUSTRIAL AUTOMATIC CYCLE
// =============================================================

AFRAME.registerComponent(
    'industrial-cycle',
    {

        // =====================================================
        // SETTINGS
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
            // Workpieces
            // -------------------------------------------------

            const elements =
                this.el.querySelectorAll(
                    '.workpiece'
                );


            this.workpieces =
                Array.from(
                    elements
                ).map(
                    (element) => {

                        return {

                            el: element,

                            processed: false,

                            previousX:
                                element
                                    .object3D
                                    .position
                                    .x

                        };

                    }
                );


            // -------------------------------------------------
            // Actuator
            // -------------------------------------------------

            this.actuator =
                this.el.querySelector(
                    '#processing-actuator'
                );


            this.tool =
                this.el.querySelector(
                    '#processing-tool'
                );


            // -------------------------------------------------
            // Sensors
            // -------------------------------------------------

            this.leftSensor =
                this.el.querySelector(
                    '#sensor-left-indicator'
                );


            this.rightSensor =
                this.el.querySelector(
                    '#sensor-right-indicator'
                );


            // -------------------------------------------------
            // Panel indicators
            // -------------------------------------------------

            this.greenLight =
                this.el.querySelector(
                    '#panel-green'
                );


            this.yellowLight =
                this.el.querySelector(
                    '#panel-yellow'
                );


            this.redLight =
                this.el.querySelector(
                    '#panel-red'
                );


            // -------------------------------------------------
            // Actuator positions
            // -------------------------------------------------

            this.actuatorTopY =
                this.actuator
                    .object3D
                    .position
                    .y;


            this.toolTopY =
                this.tool
                    .object3D
                    .position
                    .y;


            this.actuatorBottomY =
                this.actuatorTopY -
                this.data.lowerDistance;


            this.toolBottomY =
                this.toolTopY -
                this.data.lowerDistance;


            // -------------------------------------------------
            // Process state
            // -------------------------------------------------

            this.state =
                'RUNNING';


            this.stateTime =
                0;


            this.activeWorkpiece =
                null;


            // -------------------------------------------------
            // User control state
            // -------------------------------------------------

            this.userStopped =
                false;


            this.emergencyActive =
                false;


            // -------------------------------------------------
            // Initial indicators
            // -------------------------------------------------

            this.setRunningIndicators();

        },


        // =====================================================
        // MAIN LOOP
        // =====================================================

        tick: function (
            time,
            deltaTime
        ) {

            if (!deltaTime) {
                return;
            }


            // -------------------------------------------------
            // Emergency freezes everything
            // -------------------------------------------------

            if (
                this.emergencyActive
            ) {

                return;

            }


            // -------------------------------------------------
            // User stop also freezes process
            // -------------------------------------------------

            if (
                this.userStopped
            ) {

                return;

            }


            const dt =
                deltaTime /
                1000.0;


            // -------------------------------------------------
            // RUNNING
            // -------------------------------------------------

            if (
                this.state ===
                'RUNNING'
            ) {

                this.moveWorkpieces(
                    dt
                );


                this.checkProcessingStation();


                return;

            }


            // -------------------------------------------------
            // LOWERING
            // -------------------------------------------------

            if (
                this.state ===
                'LOWERING'
            ) {

                this.stateTime +=
                    deltaTime;


                const progress =
                    Math.min(
                        this.stateTime /
                        this.data.lowerDuration,
                        1
                    );


                this.moveActuator(
                    progress,
                    true
                );


                if (
                    progress >= 1
                ) {

                    this.state =
                        'PROCESSING';


                    this.stateTime =
                        0;

                }


                return;

            }


            // -------------------------------------------------
            // PROCESSING
            // -------------------------------------------------

            if (
                this.state ===
                'PROCESSING'
            ) {

                this.stateTime +=
                    deltaTime;


                if (
                    this.stateTime >=
                    this.data.processingDuration
                ) {

                    this.finishProcessing();


                    this.state =
                        'RAISING';


                    this.stateTime =
                        0;

                }


                return;

            }


            // -------------------------------------------------
            // RAISING
            // -------------------------------------------------

            if (
                this.state ===
                'RAISING'
            ) {

                this.stateTime +=
                    deltaTime;


                const progress =
                    Math.min(
                        this.stateTime /
                        this.data.raiseDuration,
                        1
                    );


                this.moveActuator(
                    progress,
                    false
                );


                if (
                    progress >= 1
                ) {

                    this.completeCycle();

                }

            }

        },


        // =====================================================
        // USER CONTROL
        // =====================================================

        handleControlAction:
            function (action) {

                switch (
                    action
                ) {

                    // -----------------------------------------
                    // START
                    // -----------------------------------------

                    case 'start':

                        if (
                            this.emergencyActive
                        ) {

                            return;

                        }


                        this.userStopped =
                            false;


                        this.updateIndicatorsForCurrentState();


                        break;


                    // -----------------------------------------
                    // STOP
                    // -----------------------------------------

                    case 'stop':

                        if (
                            this.emergencyActive
                        ) {

                            return;

                        }


                        this.userStopped =
                            true;


                        this.setStoppedIndicators();


                        break;


                    // -----------------------------------------
                    // EMERGENCY
                    // -----------------------------------------

                    case 'emergency':

                        this.emergencyActive =
                            true;


                        this.userStopped =
                            true;


                        this.setEmergencyIndicators();


                        break;


                    // -----------------------------------------
                    // RESET
                    // -----------------------------------------

                    case 'reset':

                        if (
                            !this.emergencyActive
                        ) {

                            return;

                        }


                        this.emergencyActive =
                            false;


                        // System remains stopped
                        // after emergency reset.

                        this.userStopped =
                            true;


                        this.setStoppedIndicators();


                        break;

                }

            },


        // =====================================================
        // WORKPIECE MOTION
        // =====================================================

        moveWorkpieces:
            function (dt) {

                this.workpieces.forEach(
                    (workpiece) => {

                        const position =
                            workpiece
                                .el
                                .object3D
                                .position;


                        workpiece.previousX =
                            position.x;


                        position.x +=
                            this.data.speed *
                            dt;


                        // -------------------------------------
                        // Conveyor loop
                        // -------------------------------------

                        if (
                            position.x >
                            this.data.maxX
                        ) {

                            position.x =
                                this.data.minX;


                            workpiece.previousX =
                                this.data.minX;


                            workpiece.processed =
                                false;


                            workpiece.el.setAttribute(
                                'color',
                                '#FF8C42'
                            );

                        }

                    }
                );

            },


        // =====================================================
        // STATION DETECTION
        // =====================================================

        checkProcessingStation:
            function () {

                for (
                    const workpiece
                    of this.workpieces
                ) {

                    if (
                        workpiece.processed
                    ) {

                        continue;

                    }


                    const position =
                        workpiece
                            .el
                            .object3D
                            .position;


                    if (
                        workpiece.previousX <
                            this.data.stationX
                        &&
                        position.x >=
                            this.data.stationX
                    ) {

                        position.x =
                            this.data.stationX;


                        this.startProcessing(
                            workpiece
                        );


                        break;

                    }

                }

            },


        // =====================================================
        // START PROCESSING
        // =====================================================

        startProcessing:
            function (
                workpiece
            ) {

                this.activeWorkpiece =
                    workpiece;


                this.state =
                    'LOWERING';


                this.stateTime =
                    0;


                this.setLightIntensity(
                    this.leftSensor,
                    1.5
                );


                this.setProcessingIndicators();

            },


        // =====================================================
        // ACTUATOR MOTION
        // =====================================================

        moveActuator:
            function (
                progress,
                movingDown
            ) {

                let actuatorY;

                let toolY;


                if (
                    movingDown
                ) {

                    actuatorY =
                        this.lerp(
                            this.actuatorTopY,
                            this.actuatorBottomY,
                            progress
                        );


                    toolY =
                        this.lerp(
                            this.toolTopY,
                            this.toolBottomY,
                            progress
                        );

                }

                else {

                    actuatorY =
                        this.lerp(
                            this.actuatorBottomY,
                            this.actuatorTopY,
                            progress
                        );


                    toolY =
                        this.lerp(
                            this.toolBottomY,
                            this.toolTopY,
                            progress
                        );

                }


                this.actuator
                    .object3D
                    .position
                    .y =
                        actuatorY;


                this.tool
                    .object3D
                    .position
                    .y =
                        toolY;

            },


        // =====================================================
        // PROCESSING FINISHED
        // =====================================================

        finishProcessing:
            function () {

                if (
                    !this.activeWorkpiece
                ) {

                    return;

                }


                this.activeWorkpiece.processed =
                    true;


                this.activeWorkpiece.el.setAttribute(
                    'color',
                    '#4CAF50'
                );


                this.setLightIntensity(
                    this.rightSensor,
                    1.5
                );

            },


        // =====================================================
        // CYCLE COMPLETE
        // =====================================================

        completeCycle:
            function () {

                this.state =
                    'RUNNING';


                this.stateTime =
                    0;


                this.activeWorkpiece =
                    null;


                this.setLightIntensity(
                    this.leftSensor,
                    0.25
                );


                this.setLightIntensity(
                    this.rightSensor,
                    0.25
                );


                this.setRunningIndicators();

            },


        // =====================================================
        // STATE INDICATORS
        // =====================================================

        updateIndicatorsForCurrentState:
            function () {

                if (
                    this.state ===
                    'RUNNING'
                ) {

                    this.setRunningIndicators();

                }

                else {

                    this.setProcessingIndicators();

                }

            },


        setRunningIndicators:
            function () {

                this.setLightIntensity(
                    this.greenLight,
                    1.2
                );


                this.setLightIntensity(
                    this.yellowLight,
                    0
                );


                this.setLightIntensity(
                    this.redLight,
                    0
                );

            },


        setProcessingIndicators:
            function () {

                this.setLightIntensity(
                    this.greenLight,
                    0
                );


                this.setLightIntensity(
                    this.yellowLight,
                    1.5
                );


                this.setLightIntensity(
                    this.redLight,
                    0
                );

            },


        setStoppedIndicators:
            function () {

                this.setLightIntensity(
                    this.greenLight,
                    0
                );


                this.setLightIntensity(
                    this.yellowLight,
                    0.75
                );


                this.setLightIntensity(
                    this.redLight,
                    0
                );

            },


        setEmergencyIndicators:
            function () {

                this.setLightIntensity(
                    this.greenLight,
                    0
                );


                this.setLightIntensity(
                    this.yellowLight,
                    0
                );


                this.setLightIntensity(
                    this.redLight,
                    2.0
                );

            },


        // =====================================================
        // LIGHT HELPER
        // =====================================================

        setLightIntensity:
            function (
                element,
                intensity
            ) {

                if (!element) {
                    return;
                }


                element.setAttribute(
                    'material',
                    'emissiveIntensity',
                    intensity
                );

            },


        // =====================================================
        // INTERPOLATION
        // =====================================================

        lerp:
            function (
                start,
                end,
                progress
            ) {

                return (
                    start +
                    (
                        end -
                        start
                    ) *
                    progress
                );

            }

    }
);