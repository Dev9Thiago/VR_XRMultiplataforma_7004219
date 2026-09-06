// =============================================================
// CAD DISPLAY AUTO-CENTER COMPONENT
// =============================================================
//
// Automatically centers a loaded GLB model on its A-Frame
// entity and places the lowest point of the model at Y = 0.
//
// This allows different CAD models with different origins to
// use the same display platform without manual offsets.
//
// =============================================================

AFRAME.registerComponent('cad-display-align', {

    init: function () {

        this.el.addEventListener('model-loaded', () => {

            const mesh =
                this.el.getObject3D('mesh');


            if (!mesh) {

                console.warn(
                    'CAD display: model mesh not found.'
                );

                return;

            }


            // -------------------------------------------------
            // Update transforms before calculating bounds
            // -------------------------------------------------

            mesh.updateMatrixWorld(true);


            // -------------------------------------------------
            // Calculate bounding box
            // -------------------------------------------------

            const box =
                new THREE.Box3()
                    .setFromObject(mesh);


            const center =
                new THREE.Vector3();


            const size =
                new THREE.Vector3();


            box.getCenter(center);

            box.getSize(size);


            console.log(
                'CAD model bounding size:',
                size
            );


            console.log(
                'CAD model bounding center:',
                center
            );


            // -------------------------------------------------
            // Convert world-space center to the entity's
            // local coordinate frame.
            // -------------------------------------------------

            const localCenter =
                this.el.object3D.worldToLocal(
                    center.clone()
                );


            // -------------------------------------------------
            // Find bottom of model in local coordinates
            // -------------------------------------------------

            const bottomWorld =
                new THREE.Vector3(
                    center.x,
                    box.min.y,
                    center.z
                );


            const bottomLocal =
                this.el.object3D.worldToLocal(
                    bottomWorld.clone()
                );


            // -------------------------------------------------
            // Shift actual GLB mesh
            //
            // X/Z -> geometric center
            // Y   -> bottom sits at local Y = 0
            // -------------------------------------------------

            mesh.position.x -=
                localCenter.x;


            mesh.position.z -=
                localCenter.z;


            mesh.position.y -=
                bottomLocal.y;


            mesh.updateMatrixWorld(true);


            console.log(
                'CAD model automatically centered on platform.'
            );

        });

    }

});