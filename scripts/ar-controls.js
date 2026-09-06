// =============================================================
// XR-NATIVE AR CONTROLS
// =============================================================
//
// The controls are THREE/A-Frame objects inside the XR scene.
//
// No HTML DOM overlay is used for interaction.
//
// User interaction:
//
// - Tap along the slider to choose rotation.
// - Tap REPOSITION to restart surface placement.
//
// =============================================================


AFRAME.registerComponent(
    'ar-controls',
    {

        // =====================================================
        // INIT
        // =====================================================

        init: function () {

            this.root =
                this.el;


            this.slider =
                document.querySelector(
                    '#ar-rotation-slider-3d'
                );


            this.knob =
                document.querySelector(
                    '#ar-rotation-knob'
                );


            this.rotationText =
                document.querySelector(
                    '#ar-rotation-value-3d'
                );


            this.distanceText =
                document.querySelector(
                    '#ar-distance-value-3d'
                );


            this.scaleText =
                document.querySelector(
                    '#ar-scale-value-3d'
                );


            this.repositionButton =
                document.querySelector(
                    '#ar-reposition-3d'
                );


            this.enabled =
                false;


            this.sliderWidth =
                0.60;


            this.currentRotation =
                0;


            this.raycaster =
                new THREE.Raycaster();


            // Initial state.

            this.setEnabled(
                false
            );


            this.setSliderValue(
                0
            );

        },


        // =====================================================
        // ENABLE / DISABLE
        // =====================================================

        setEnabled: function (
            enabled
        ) {

            this.enabled =
                enabled;


            if (
                this.slider
            ) {

                this.slider.setAttribute(
                    'material',
                    'opacity',
                    enabled
                        ? 1
                        : 0.35
                );

            }


            if (
                this.knob
            ) {

                this.knob.setAttribute(
                    'material',
                    'opacity',
                    enabled
                        ? 1
                        : 0.35
                );

            }


            if (
                this.repositionButton
            ) {

                this.repositionButton.setAttribute(
                    'material',
                    'opacity',
                    enabled
                        ? 1
                        : 0.35
                );

            }

        },


        // =====================================================
        // HANDLE XR SELECT
        // =====================================================
        //
        // Returns TRUE if the interaction was consumed by
        // this control panel.
        //
        // =====================================================

        handleXRSelect: function (
            event
        ) {

            if (
                !this.root.object3D.visible
                ||
                !this.enabled
            ) {

                return false;

            }


            const scene =
                this.el.sceneEl;


            const placementComponent =
                scene.components[
                    'ar-placement'
                ];


            if (
                !placementComponent
                ||
                !placementComponent.referenceSpace
            ) {

                return false;

            }


            const frame =
                event.frame;


            const inputSource =
                event.inputSource;


            if (
                !frame
                ||
                !inputSource
                ||
                !inputSource.targetRaySpace
            ) {

                return false;

            }


            const pose =
                frame.getPose(

                    inputSource.targetRaySpace,

                    placementComponent.referenceSpace

                );


            if (
                !pose
            ) {

                return false;

            }


            // =================================================
            // BUILD WORLD RAY
            // =================================================

            const rayMatrix =
                new THREE.Matrix4();


            rayMatrix.fromArray(
                pose.transform.matrix
            );


            const origin =
                new THREE.Vector3(
                    0,
                    0,
                    0
                );


            const direction =
                new THREE.Vector3(
                    0,
                    0,
                    -1
                );


            origin.applyMatrix4(
                rayMatrix
            );


            direction
                .transformDirection(
                    rayMatrix
                )
                .normalize();


            this.raycaster.set(
                origin,
                direction
            );


            // =================================================
            // REPOSITION BUTTON
            // =================================================

            const repositionHits =
                this.raycaster
                    .intersectObject(

                        this.repositionButton
                            .object3D,

                        true

                    );


            if (
                repositionHits.length > 0
            ) {

                placementComponent.reposition();

                return true;

            }


            // =================================================
            // ROTATION SLIDER
            // =================================================

            const sliderHits =
                this.raycaster
                    .intersectObject(

                        this.slider
                            .object3D,

                        true

                    );


            if (
                sliderHits.length > 0
            ) {

                const hit =
                    sliderHits[0];


                // Convert hit point from world coordinates
                // into slider local coordinates.

                const localPoint =
                    this.slider
                        .object3D
                        .worldToLocal(
                            hit.point.clone()
                        );


                const halfWidth =
                    this.sliderWidth
                    /
                    2;


                let normalized =
                    (
                        localPoint.x
                        +
                        halfWidth
                    )
                    /
                    this.sliderWidth;


                normalized =
                    THREE.MathUtils.clamp(
                        normalized,
                        0,
                        1
                    );


                const degrees =
                    normalized
                    *
                    360;


                this.setSliderValue(
                    degrees
                );


                placementComponent
                    .setRotationDegrees(
                        degrees
                    );


                return true;

            }


            return false;

        },


        // =====================================================
        // SET SLIDER VALUE
        // =====================================================

        setSliderValue: function (
            degrees
        ) {

            degrees =
                THREE.MathUtils.clamp(
                    degrees,
                    0,
                    360
                );


            this.currentRotation =
                degrees;


            const normalized =
                degrees
                /
                360;


            const halfWidth =
                this.sliderWidth
                /
                2;


            const x =
                -halfWidth
                +
                normalized
                *
                this.sliderWidth;


            if (
                this.knob
            ) {

                this.knob
                    .object3D
                    .position
                    .x =
                        x;

            }


            if (
                this.rotationText
            ) {

                this.rotationText.setAttribute(
                    'value',
                    Math.round(
                        degrees
                    )
                    +
                    ' deg'
                );

            }

        },


        // =====================================================
        // DISTANCE + SCALE INFORMATION
        // =====================================================

        updateDistance: function (
            distance,
            scaleMultiplier
        ) {

            if (
                this.distanceText
            ) {

                this.distanceText.setAttribute(
                    'value',

                    'Distance: '
                    +
                    distance.toFixed(
                        2
                    )
                    +
                    ' m'
                );

            }


            if (
                this.scaleText
            ) {

                this.scaleText.setAttribute(
                    'value',

                    'Scale: '
                    +
                    scaleMultiplier
                        .toFixed(
                            2
                        )
                    +
                    'x'
                );

            }

        }

    }
);