#include <cuda_runtime.h>


__global__ void copy_kernel(float *src, float *dst, int width, int height, int stride_x_src, int stride_y_src, int stride_x_dst, int stride_y_dst) {
    const int block_size = blockDim.x;
    const int tid = threadIdx.x;
    const int element_per_thread = width * height / block_size;
    for (int i = 0; i < element_per_thread; i++) {
        const int src_x = (i * block_size + tid) % width;
        const int src_y = (i * block_size + tid) / width;
        const int dst_x = (i * block_size + tid) % width;
        const int dst_y = (i * block_size + tid) / width;
        dst[dst_y * stride_y_dst + dst_x * stride_x_dst] = src[src_y * stride_y_src + src_x * stride_x_src];
    }
}

int main() {
    const int width = 1024;
    const int height = 1024;
    const int stride_x_src = 1;
    const int stride_y_src = 1024;
    const int stride_x_dst = 1;
    const int stride_y_dst = 1024;
    float *src, *dst;
    cudaMallocManaged(&src, width * height * sizeof(float));
    cudaMallocManaged(&dst, width * height * sizeof(float));
    for (int i = 0; i < width * height; i++) {
        src[i] = static_cast<float>(i);
    }
    copy_kernel<<<1, 1024>>>(src, dst, width, height, stride_x_src, stride_y_src, stride_x_dst, stride_y_dst);
    if (cudaGetLastError() != cudaSuccess) {
        printf("Error: %s\n", cudaGetErrorString(cudaGetLastError()));
        return 1;
    }
    cudaDeviceSynchronize();
    for (int i = 0; i < width * height; i++) {
        if (dst[i] != src[i]) {
            printf("Error: dst[%d] = %f, src[%d] = %f\n", i, dst[i], i, src[i]);
            return 1;
        }
    }
    printf("Test passed\n");
    cudaFree(src);
    cudaFree(dst);
    return 0;
}
